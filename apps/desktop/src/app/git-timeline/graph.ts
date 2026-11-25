export interface GitCommit {
  hash: string
  parents: string[]
  author: string
  date: string
  subject: string
  message: string
}

export interface GitHistory {
  commits: GitCommit[]
  refs: { name: string; hash: string }[]
  main_ref: string | null
  truncated: boolean
}

export function shortRef(ref: string): string {
  return ref.replace(/^refs\/(heads|remotes)\//, '')
}

/** Git returns children before their parents. Reserve lane zero for the
 * primary ref's first-parent chain, then work backward through each fork. */
export function layoutGitHistory({ commits, refs, main_ref }: GitHistory) {
  const byHash = new Map(commits.map(commit => [commit.hash, commit]))
  const primary = new Set<string>()
  let main: string | undefined = refs.find(ref => ref.name === main_ref)?.hash ?? commits[0]?.hash

  while (main && byHash.has(main) && !primary.has(main)) {
    primary.add(main)
    main = byHash.get(main)?.parents[0]
  }

  const pending = new Map<string, number>()

  const availableLane = () => {
    const occupied = new Set(pending.values())
    let distance = 1

    while (occupied.has(distance) && occupied.has(-distance)) {
      distance++
    }

    return occupied.has(distance) ? -distance : distance
  }

  const refLabels = new Map<string, string[]>()

  for (const ref of refs) {
    const labels = refLabels.get(ref.hash) ?? []

    labels.push(shortRef(ref.name))
    refLabels.set(ref.hash, labels)
  }

  const nodes = commits.map(commit => {
    const lane = primary.has(commit.hash) ? 0 : (pending.get(commit.hash) ?? availableLane())

    pending.delete(commit.hash)

    for (const [index, parent] of commit.parents.entries()) {
      if (primary.has(parent) || !byHash.has(parent) || pending.has(parent)) {
        continue
      }

      // A merge's first parent continues its lane. Other parents fan out.
      pending.set(parent, index === 0 && lane !== 0 ? lane : availableLane())
    }

    return { commit, lane, labels: refLabels.get(commit.hash) ?? [] }
  })

  return nodes.reverse()
}
