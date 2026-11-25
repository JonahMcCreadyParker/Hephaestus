import './proximity-sidebar.css'

import { useVirtualizer } from '@tanstack/react-virtual'
import { Bookmark } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'


export interface ProximitySection {
  id: string
  label: string
  bookmarkKey?: string
}

export function timelineBarWidth(index: number, activeIndex: number, hoverIndex: number | null): number {
  const curve = (distance: number) => (Math.abs(distance) > 3 ? 0 : Math.exp(-(distance ** 2) / 1.35))

  return 0.5 + 0.5 * Math.max(curve(index - activeIndex), hoverIndex === null ? 0 : curve(index - hoverIndex))
}

const PULSE_MS = 160
export const TIMELINE_MARKER_PITCH_REM = 0.625

function markerOffset(index: number, hovered: number | null, pitch: number): number {
  const distance = hovered === null ? 0 : index - hovered

  return Math.sign(distance) * pitch * 0.65 * Math.max(0, 1 - (Math.abs(distance) - 1) / 6)
}

interface ProximitySidebarProps {
  activeIndex: number
  loadingId: string | null
  onJump: (id: string) => void
  sections: readonly ProximitySection[]
  bookmarks: ReadonlySet<string>
  onBookmark: (key: string) => void
}

/** Only the visible slice owns DOM or tooltip instances. Pointer paint is local. */
export function ProximitySidebar({
  activeIndex,
  loadingId,
  onJump,
  sections,
  bookmarks,
  onBookmark
}: ProximitySidebarProps) {
  const root = useRef<HTMLDivElement>(null)
  const pointerY = useRef<number | null>(null)
  const focused = useRef(false)
  const pendingFocus = useRef<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [pitch, setPitch] = useState(16 * TIMELINE_MARKER_PITCH_REM)
  const hovered = hoverIndex === null ? undefined : sections[hoverIndex]

  const virtualizer = useVirtualizer({
    count: sections.length,
    estimateSize: () => pitch,
    getItemKey: index => sections[index].id,
    getScrollElement: () => root.current,
    initialRect: { height: 300, width: 48 },
    overscan: 4
  })

  const items = virtualizer.getVirtualItems()
  const visibleKey = `${items[0]?.index}:${items.at(-1)?.index}`

  useLayoutEffect(() => {
    const element = root.current

    if (!element) {
      return
    }

    const measure = () => {
      const rem = parseFloat(getComputedStyle(element.ownerDocument.documentElement).fontSize)

      if (Number.isFinite(rem) && rem > 0) {
        setPitch(rem * TIMELINE_MARKER_PITCH_REM)
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()

    return () => observer.disconnect()
  }, [])

  useEffect(() => virtualizer.measure(), [pitch, virtualizer])

  useLayoutEffect(() => {
    if (pendingFocus.current !== null) {
      const button = root.current?.querySelector<HTMLButtonElement>(`[data-timeline-index="${pendingFocus.current}"]`)

      if (button) {
        button.focus({ preventScroll: true })
        pendingFocus.current = null
      }
    }
  }, [visibleKey])

  useEffect(() => {
    if (pointerY.current === null && !focused.current) {
      virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    }
  }, [activeIndex, virtualizer])

  const updatePointer = () => {
    const scroller = root.current

    if (!scroller || pointerY.current === null) {
      return
    }

    const y = pointerY.current - scroller.getBoundingClientRect().top + scroller.scrollTop
    const base = Math.max(0, Math.min(sections.length - 1, Math.floor(y / pitch)))
    setHoverIndex(current => {
      let nearest = base
      let best = Infinity

      for (let index = Math.max(0, base - 1); index <= Math.min(sections.length - 1, base + 1); index++) {
        const distance = Math.abs((index + 0.5) * pitch + markerOffset(index, current, pitch) - y)

        if (distance < best) {
          nearest = index
          best = distance
        }
      }

      return nearest
    })
  }

  return (
    <div
      className="relative h-full"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false

          if (pointerY.current === null) {setHoverIndex(null)}
        }
      }}
      onKeyDown={event => {
        const index = Number(
          (event.target as HTMLElement).closest<HTMLElement>('[data-timeline-index]')?.dataset.timelineIndex
        )

        const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: sections.length - 1 }[event.key]
        const bookmarkKey = sections[index]?.bookmarkKey

        if (event.key.toLowerCase() === 'b' && bookmarkKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault()
          onBookmark(bookmarkKey)

          return
        }

        if (next === undefined || !Number.isFinite(next)) {
          return
        }

        event.preventDefault()
        pendingFocus.current = Math.max(0, Math.min(sections.length - 1, next))
        virtualizer.scrollToIndex(pendingFocus.current, { align: 'auto' })
        root.current
          ?.querySelector<HTMLButtonElement>(`[data-timeline-index="${pendingFocus.current}"]`)
          ?.focus({ preventScroll: true })
      }}
      onPointerLeave={() => {
        pointerY.current = null
        setHoverIndex(null)
      }}
    >
      <div
        className="thread-timeline-ticks"
        data-slot="thread-timeline-ticks"
        onPointerMove={event => {
          pointerY.current = event.clientY
          updatePointer()
        }}
        onScroll={event => {
          setScrollTop(event.currentTarget.scrollTop)
          updatePointer()
        }}
        ref={root}
      >
        <div className="thread-timeline-track" style={{ height: virtualizer.getTotalSize() }}>
          {items.map(item => {
            const entry = sections[item.index]

            const offset = markerOffset(item.index, hoverIndex, pitch)
            const emphasis = hoverIndex === null ? 0 : (timelineBarWidth(item.index, hoverIndex, hoverIndex) - 0.5) * 2
            const widthScale = 0.75 + emphasis * 0.375
            const thickness = 1.5 + emphasis * 1.75
            const bookmarked = entry.bookmarkKey !== undefined && bookmarks.has(entry.bookmarkKey)

            return (
              <button
                aria-busy={loadingId === entry.id || undefined}
                aria-current={item.index === activeIndex ? 'location' : undefined}
                aria-keyshortcuts={entry.bookmarkKey ? 'B' : undefined}
                aria-label={entry.label}
                className="thread-timeline-tick"
                data-timeline-id={entry.id}
                data-timeline-index={item.index}
                key={entry.id}
                onClick={() => onJump(entry.id)}
                onFocus={() => {
                  focused.current = true
                  setHoverIndex(item.index)
                }}
                style={{ top: item.start, height: pitch, transform: `translateY(${offset}px)` }}
                type="button"
              >
                {bookmarked && (
                  <span
                    aria-hidden
                    className="thread-timeline-bookmark-dot"
                    style={{ transform: `translateX(${(1 - widthScale) * 2}rem) scale(${thickness})` }}
                  />
                )}
                <span
                  aria-hidden
                  data-slot="timeline-bar"
                  style={{ transform: `scale(${widthScale}, ${thickness})` }}
                />
              </button>
            )
          })}
        </div>
      </div>
      {hovered && hoverIndex !== null && (
        <div
          className="thread-timeline-preview"
          style={{ top: `clamp(2rem, ${(hoverIndex + 0.5) * pitch - scrollTop}px, calc(100% - 2rem))` }}
        >
          <span className="line-clamp-3 break-words">{hovered.label}</span>
          {hovered.bookmarkKey && (
            <button
              aria-label="Bookmark prompt"
              aria-pressed={bookmarks.has(hovered.bookmarkKey)}
              className="shrink-0 rounded p-1 text-(--theme-primary) hover:bg-muted focus-visible:outline"
              onClick={() => onBookmark(hovered.bookmarkKey!)}
              type="button"
            >
              <Bookmark fill={bookmarks.has(hovered.bookmarkKey) ? 'currentColor' : 'none'} size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
