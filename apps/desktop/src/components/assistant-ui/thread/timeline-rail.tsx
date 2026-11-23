import { useMemo } from 'react'

import { ProximitySidebar } from '@/components/ui/proximity-sidebar'

import type { TimelineEntry } from './timeline-data'

interface TimelineRailProps {
  activeIndex: number
  entries: TimelineEntry[]
  loadingId: string | null
  onJump: (id: string) => void
}

export function TimelineRail({ activeIndex, entries, loadingId, onJump }: TimelineRailProps) {
  const sections = useMemo(() => entries.map(entry => ({ id: entry.id, label: entry.preview })), [entries])

  return <ProximitySidebar activeIndex={activeIndex} loadingId={loadingId} onJump={onJump} sections={sections} />
}
