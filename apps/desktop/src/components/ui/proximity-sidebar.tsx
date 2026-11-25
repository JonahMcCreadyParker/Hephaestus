import './proximity-sidebar.css'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Tip } from '@/components/ui/tooltip'

export interface ProximitySection {
  id: string
  label: string
}

export function timelineBarWidth(index: number, activeIndex: number, hoverIndex: number | null): number {
  const curve = (distance: number) => (Math.abs(distance) > 3 ? 0 : Math.exp(-(distance ** 2) / 1.35))

  return 0.5 + 0.5 * Math.max(curve(index - activeIndex), hoverIndex === null ? 0 : curve(index - hoverIndex))
}

const PULSE_MS = 160
export const TIMELINE_MARKER_PITCH_REM = 0.625

interface ProximitySidebarProps {
  activeIndex: number
  loadingId: string | null
  onJump: (id: string) => void
  sections: readonly ProximitySection[]
}

/** Only the visible slice owns DOM or tooltip instances. Pointer paint is local. */
export function ProximitySidebar({ activeIndex, loadingId, onJump, sections }: ProximitySidebarProps) {
  const reducedMotion = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const hover = useRef<number | null>(null)
  const pointerY = useRef<number | null>(null)
  const frame = useRef(0)
  const focused = useRef(false)
  const lastActive = useRef(activeIndex)
  const pulsing = useRef(false)
  const pendingFocus = useRef<number | null>(null)
  const [pitch, setPitch] = useState(16 * TIMELINE_MARKER_PITCH_REM)

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

  const paint = useCallback(() => {
    frame.current = 0

    for (const bar of root.current?.querySelectorAll<HTMLElement>('[data-slot="timeline-bar"]') ?? []) {
      const width =
        hover.current === null && !pulsing.current
          ? 0.5
          : timelineBarWidth(Number(bar.dataset.index), activeIndex, hover.current)

      const emphasis = (width - 0.5) * 2
      const transform = `scale(${(0.25 + emphasis * 0.875).toFixed(4)}, ${(1 + emphasis * 2.25).toFixed(4)})`

      if (bar.style.transform !== transform) {
        bar.style.transform = transform
      }
    }
  }, [activeIndex])

  const schedule = useCallback(() => {
    if (!frame.current) {
      frame.current = requestAnimationFrame(paint)
    }
  }, [paint])

  useLayoutEffect(() => {
    paint()

    if (pendingFocus.current !== null) {
      const button = root.current?.querySelector<HTMLButtonElement>(`[data-timeline-index="${pendingFocus.current}"]`)

      if (button) {
        button.focus({ preventScroll: true })
        pendingFocus.current = null
      }
    }

    return () => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [paint, visibleKey])

  useEffect(() => {
    if (hover.current === null && !focused.current) {
      virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    }
  }, [activeIndex, virtualizer])

  // eslint-disable-next-line no-restricted-syntax -- Records the last pulse target to skip the initial paint.
  useEffect(() => {
    if (lastActive.current === activeIndex) {
      return
    }

    lastActive.current = activeIndex

    if (reducedMotion) {
      return
    }

    pulsing.current = hover.current === null
    schedule()

    const reset = setTimeout(() => {
      pulsing.current = false
      schedule()
    }, PULSE_MS)

    return () => {
      clearTimeout(reset)
      pulsing.current = false
    }
  }, [activeIndex, reducedMotion, schedule])

  const updatePointer = useCallback(() => {
    const scroller = root.current

    if (!scroller || pointerY.current === null) {
      return
    }

    const y = pointerY.current - scroller.getBoundingClientRect().top + scroller.scrollTop
    hover.current = Math.max(0, Math.min(sections.length - 1, y / pitch - 0.5))
    schedule()
  }, [sections.length, pitch, schedule])

  return (
    <div
      className="thread-timeline-ticks"
      data-slot="thread-timeline-ticks"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false
          hover.current = null
          schedule()
        }
      }}
      onKeyDown={event => {
        const index = Number(
          (event.target as HTMLElement).closest<HTMLElement>('[data-timeline-index]')?.dataset.timelineIndex
        )

        const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: sections.length - 1 }[event.key]

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
        hover.current = null
        schedule()
      }}
      onPointerMove={event => {
        pointerY.current = event.clientY
        updatePointer()
      }}
      onScroll={updatePointer}
      ref={root}
    >
      <div className="thread-timeline-track" style={{ height: virtualizer.getTotalSize() }}>
        {items.map(item => {
          const entry = sections[item.index]

          return (
            <Tip
              key={entry.id}
              label={entry.label}
              placement="right-rail"
              sideOffset={8}
              style={{ textAlign: 'right' }}
            >
              <button
                aria-busy={loadingId === entry.id || undefined}
                aria-current={item.index === activeIndex ? 'location' : undefined}
                aria-label={entry.label}
                className="thread-timeline-tick"
                data-timeline-id={entry.id}
                data-timeline-index={item.index}
                onClick={() => onJump(entry.id)}
                onFocus={() => {
                  focused.current = true
                  hover.current = item.index
                  schedule()
                }}
                style={{ top: item.start, height: pitch }}
                type="button"
              >
                <span aria-hidden data-index={item.index} data-slot="timeline-bar" />
              </button>
            </Tip>
          )
        })}
      </div>
    </div>
  )
}
