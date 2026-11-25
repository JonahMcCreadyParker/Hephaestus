import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tip } from '@/components/ui/tooltip'
import { registry } from '@/contrib/registry'
import { $activeConnectionId } from '@/store/connections'
import { $activeGatewayProfile } from '@/store/profile'
import { $projectTree, refreshProjectTree, requestProjectGit } from '@/store/projects'

import { type GitCommit, type GitHistory, layoutGitHistory, mainLaneJunctions, shortRef } from './graph'

const COLUMN = 68
const LANE_HEIGHT = 60
const LEFT = 108
const BRANCH_COLORS = ['#4a9ce8', '#df7c9b', '#22a989', '#a481e8', '#d88746']

const laneColor = (lane: number) =>
  lane === 0 ? 'var(--theme-primary)' : BRANCH_COLORS[(Math.abs(lane) * 2 - (lane > 0 ? 2 : 1)) % BRANCH_COLORS.length]

function CommitDetails({ commit, labels }: { commit: GitCommit; labels: string[] }) {
  const date = new Date(commit.date)

  return (
    <div className="max-w-sm space-y-1 text-left">
      <p className="break-words font-semibold">{commit.subject || 'Untitled commit'}</p>
      <p className="text-muted-foreground">
        {commit.author} · {Number.isNaN(date.getTime()) ? commit.date : date.toLocaleString()}
      </p>
      <code className="break-all text-xs">{commit.hash}</code>
      {commit.parents.length > 1 && <p>Merge commit · {commit.parents.length} parents</p>}
      {labels.length > 0 && <p className="break-words">{labels.join(', ')}</p>}
      {commit.message.trim() && <p className="line-clamp-8 whitespace-pre-wrap break-words pt-1">{commit.message}</p>}
    </div>
  )
}

function CommitGraph({ history }: { history: GitHistory }) {
  const graph = useMemo(() => layoutGitHistory(history), [history])
  const { forks, merges } = useMemo(() => mainLaneJunctions(graph), [graph])
  const scroll = useRef<HTMLDivElement>(null)
  const radius = Math.max(1, ...graph.map(node => Math.abs(node.lane)))
  const center = (radius + 1) * LANE_HEIGHT
  const width = LEFT + graph.length * COLUMN + 80

  const points = graph.map((node, index) => ({
    ...node,
    x: LEFT + index * COLUMN,
    y: center + node.lane * LANE_HEIGHT
  }))

  const byHash = new Map(points.map(point => [point.commit.hash, point]))
  const latestJunction = points.findLast(point => merges.has(point.commit.hash) || forks.has(point.commit.hash))

  useLayoutEffect(() => {
    if (scroll.current) {
      scroll.current.scrollLeft = scroll.current.scrollWidth
      scroll.current.scrollTop = (scroll.current.scrollHeight - scroll.current.clientHeight) / 2
    }
  }, [history])

  return (
    <div
      aria-label="Commit timeline, oldest to newest"
      className="min-h-0 flex-1 overflow-auto rounded-lg border border-border"
      ref={scroll}
    >
      <div className="sticky left-0 top-2 z-10 flex h-0 w-max items-start px-2">
        {latestJunction ? (
          <Button
            onClick={() => scroll.current?.scrollTo({ left: latestJunction.x - scroll.current.clientWidth / 2 })}
            size="sm"
            variant="outline"
          >
            Show latest fork or merge
          </Button>
        ) : (
          <span className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
            No main-lane fork or merge in this history window
          </span>
        )}
      </div>
      <div className="flex min-h-full items-center" style={{ minWidth: width }}>
        <div className="relative w-full" style={{ height: center * 2 }}>
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
            <line stroke="var(--ui-stroke-secondary)" strokeDasharray="4 6" x1={0} x2="100%" y1={center} y2={center} />
            {points.flatMap(child =>
              child.commit.parents.map(hash => {
                const parent = byHash.get(hash)

                if (!parent) {
                  return null
                }

                const bend = Math.min(24, (child.x - parent.x) / 2)
                const start = child.lane === 0 ? child.x - bend * 2 : parent.x
                const end = start + bend * 2
                const color = laneColor(parent.lane || child.lane)
                const junction = (parent.lane === 0) !== (child.lane === 0)

                return (
                  <path
                    d={`M ${parent.x} ${parent.y} H ${start} C ${start + bend} ${parent.y}, ${start + bend} ${child.y}, ${end} ${child.y} H ${child.x}`}
                    fill="none"
                    key={`${hash}:${child.commit.hash}`}
                    stroke={color}
                    strokeOpacity={junction ? 1 : 0.78}
                    strokeWidth={junction ? 3 : 2}
                  />
                )
              })
            )}
          </svg>
          <div
            className="absolute left-3 max-w-20 -translate-y-full truncate pb-1 text-xs font-medium text-muted-foreground"
            style={{ top: center }}
          >
            {history.main_ref ? shortRef(history.main_ref) : 'Primary lane'}
          </div>
          {points.map(({ commit, labels, lane, x, y }) => (
            <div className="absolute" key={commit.hash} style={{ left: x, top: y }}>
              {(forks.has(commit.hash) || merges.has(commit.hash)) && (
                <span className="pointer-events-none absolute bottom-4 left-0 -translate-x-1/2 whitespace-nowrap rounded border border-primary/40 bg-background px-1 text-xs font-medium">
                  {merges.has(commit.hash) ? (forks.has(commit.hash) ? 'Merge / Fork' : 'Merge') : 'Fork'}
                </span>
              )}
              <Tip label={<CommitDetails commit={commit} labels={labels} />}>
                <button
                  aria-label={`${commit.subject || 'Untitled commit'} (${commit.hash.slice(0, 8)})`}
                  className="grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-ring hover:bg-muted focus-visible:outline-2"
                  type="button"
                >
                  <span
                    className={
                      commit.parents.length > 1
                        ? 'size-3 rotate-45 rounded-xs border-2 bg-background'
                        : 'size-2.5 rounded-full border-2 bg-background'
                    }
                    style={{ borderColor: laneColor(lane) }}
                  />
                </button>
              </Tip>
              {labels.length > 0 && (
                <span
                  className="pointer-events-none absolute left-0 top-4 max-w-16 truncate rounded bg-muted px-1.5 py-0.5 text-xs"
                  style={{ color: laneColor(lane) }}
                >
                  {labels[0]}
                  {labels.length > 1 ? ` +${labels.length - 1}` : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GitTimelinePage() {
  const projects = useStore($projectTree)
  const connectionId = useStore($activeConnectionId)
  const profile = useStore($activeGatewayProfile)
  const [selected, setSelected] = useState('')
  const [limit, setLimit] = useState(250)

  useEffect(() => {
    void refreshProjectTree()
  }, [connectionId, profile])

  const candidates = useMemo(() => {
    const options = new Map<string, string>()

    for (const project of projects) {
      for (const repo of project.repos) {
        if (repo.path && !options.has(repo.path)) {
          options.set(repo.path, project.label === repo.label ? repo.label : `${project.label} / ${repo.label}`)
        }
      }
    }

    return options
  }, [projects])

  const paths = [...candidates.keys()].slice(0, 150)

  const repositories = useQuery({
    queryKey: ['git-timeline-repositories', connectionId, profile, paths],
    queryFn: () => requestProjectGit<{ paths: string[] }>('projects.git_repositories', { paths }),
    enabled: paths.length > 0,
    retry: false,
    staleTime: 60_000
  })

  const available = repositories.data?.paths ?? []
  const path = available.includes(selected) ? selected : (available[0] ?? '')

  const history = useQuery({
    queryKey: ['git-timeline-history', connectionId, profile, path, limit],
    queryFn: () => requestProjectGit<GitHistory>('projects.git_history', { path, limit }),
    enabled: Boolean(path),
    retry: false
  })

  const error = repositories.error ?? history.error

  return (
    <main className="flex h-full min-h-0 flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="text-xl font-semibold">Git Timeline</h1>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Repository
            <select
              className="max-w-[min(32rem,65vw)] rounded-md border border-input bg-background px-2 py-1.5"
              disabled={!available.length}
              onChange={event => {
                setSelected(event.currentTarget.value)
                setLimit(250)
              }}
              value={path}
            >
              {!available.length && <option value="">No repositories available</option>}
              {available.map(repo => (
                <option key={repo} value={repo}>
                  {candidates.get(repo) ?? repo}
                </option>
              ))}
            </select>
          </label>
          {path && <p className="break-all text-xs text-muted-foreground">{path}</p>}
        </div>
        <div className="flex gap-2">
          {history.data?.truncated && limit < 1000 && (
            <Button onClick={() => setLimit(1000)} size="sm" variant="secondary">
              Load older commits
            </Button>
          )}
          <Button
            disabled={!path || history.isFetching}
            onClick={() => void history.refetch()}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </header>
      {error ? (
        <p role="alert">{error.message}</p>
      ) : repositories.isLoading || history.isLoading ? (
        <p role="status">Loading Git history…</p>
      ) : history.data?.commits.length ? (
        <>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Oldest → Newest · ◇ Merge commit
              {history.data.main_ref && ` · Center lane: ${shortRef(history.data.main_ref)}`}
            </span>
            <span>
              {history.data.commits.length} commits{history.data.truncated ? ' shown' : ''}
            </span>
          </div>
          <CommitGraph history={history.data} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {path
            ? 'This repository has no commits.'
            : 'Add an existing Git checkout to a Hermes project to see it here.'}
        </p>
      )}
    </main>
  )
}

export function registerGitTimeline() {
  registry.registerMany([
    {
      id: 'git-timeline',
      area: 'routes',
      title: 'Git Timeline',
      data: { path: '/git-timeline' },
      render: () => <GitTimelinePage />
    },
    {
      id: 'git-timeline',
      area: 'sidebar.nav',
      data: { path: '/git-timeline', codicon: 'source-control', label: 'Git Timeline' }
    }
  ])
}
