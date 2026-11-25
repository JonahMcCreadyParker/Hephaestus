import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { TimelineRail } from './timeline-rail'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 30,
    getVirtualItems: () => [
      { index: 0, start: 0 },
      { index: 1, start: 10 },
      { index: 2, start: 20 }
    ],
    measure: vi.fn(),
    scrollToIndex: vi.fn()
  })
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('fans out the nearby markers and restores a bookmark when the chat reopens', () => {
  const entries = ['First', 'Middle', 'Last'].map((preview, index) => ({ id: preview, preview, rowId: index + 1 }))
  const rail = <TimelineRail activeIndex={1} entries={entries} loadingId={null} onJump={vi.fn()} sessionId="chat" />
  const { unmount } = render(rail)
  const first = screen.getByRole('button', { name: 'First' })
  const last = screen.getByRole('button', { name: 'Last' })

  expect(first.style.transform).toBe('translateY(0px)')
  fireEvent.focus(screen.getByRole('button', { name: 'Middle' }))
  expect(first.style.transform).toBe('translateY(-6.5px)')
  expect(last.style.transform).toBe('translateY(6.5px)')
  fireEvent.click(screen.getByRole('button', { name: 'Bookmark prompt' }))
  expect(screen.getByRole('button', { name: 'Bookmark prompt' }).getAttribute('aria-pressed')).toBe('true')

  unmount()
  render(rail)
  const middle = screen.getByRole('button', { name: 'Middle' })
  const dot = middle.querySelector<HTMLElement>('.thread-timeline-bookmark-dot')

  expect(middle.querySelector<HTMLElement>('[data-slot="timeline-bar"]')?.style.transform).toBe('scale(0.75, 1.5)')
  expect(dot?.style.transform).toBe('translateX(0.5rem) scale(1.5)')
  fireEvent.focus(middle)
  expect(dot?.style.transform).toBe('translateX(-0.25rem) scale(3.25)')
  const bookmark = screen.getByRole('button', { name: 'Bookmark prompt' })

  expect(bookmark.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(bookmark)
  expect(bookmark.getAttribute('aria-pressed')).toBe('false')
})
