import { useMemo, useState } from 'react'

import { ProximitySidebar } from '@/components/ui/proximity-sidebar'

import { EARLIER_TIMELINE_ID, type TimelineEntry } from './timeline-data'

interface TimelineRailProps {
  activeIndex: number
  entries: TimelineEntry[]
  loadingId: string | null
  onJump: (id: string) => void
  sessionId: string | null
}

export function TimelineRail({ activeIndex, entries, loadingId, onJump, sessionId }: TimelineRailProps) {
  const storageKey = sessionId ? `hermes.desktop.timelineBookmarks:${sessionId}` : null

  const [bookmarks, setBookmarks] = useState<ReadonlySet<string>>(() => {
    try {
      const data: unknown = storageKey ? JSON.parse(localStorage.getItem(storageKey) ?? '[]') : []

      return new Set(Array.isArray(data) ? data.filter((value): value is string => typeof value === 'string') : [])
    } catch {
      return new Set()
    }
  })

  const sections = useMemo(
    () =>
      entries.map(entry => ({
        id: entry.id,
        label: entry.preview,
        bookmarkKey: entry.id === EARLIER_TIMELINE_ID ? undefined : String(entry.rowId ?? entry.id)
      })),
    [entries]
  )

  const toggleBookmark = (key: string) => {
    const next = new Set(bookmarks)

    if (!next.delete(key)) {next.add(key)}

    try {
      if (storageKey) {localStorage.setItem(storageKey, JSON.stringify([...next]))}
    } catch {
      // Keep the bookmark available in this view if storage is unavailable.
    }

    setBookmarks(next)
  }

  return (
    <ProximitySidebar
      activeIndex={activeIndex}
      bookmarks={bookmarks}
      loadingId={loadingId}
      onBookmark={toggleBookmark}
      onJump={onJump}
      sections={sections}
    />
  )
}
