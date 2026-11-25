import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { HoldPreviewButton } from './hold-preview-button'

afterEach(cleanup)

it('reveals the preview while held and restores it on release or window blur', () => {
  const onHold = vi.fn()
  const onRelease = vi.fn()
  render(<HoldPreviewButton onHold={onHold} onRelease={onRelease} />)
  const button = screen.getByRole('button', { name: 'Hold to preview' })

  fireEvent.keyDown(button, { key: ' ' })
  expect(button.hasAttribute('data-theme-preview-held')).toBe(true)
  expect(onHold).toHaveBeenCalledOnce()
  fireEvent.keyUp(button, { key: ' ' })
  expect(button.hasAttribute('data-theme-preview-held')).toBe(false)
  expect(onRelease).toHaveBeenCalledOnce()

  fireEvent.keyDown(button, { key: 'Enter' })
  fireEvent.blur(window)
  expect(button.hasAttribute('data-theme-preview-held')).toBe(false)
  expect(onRelease).toHaveBeenCalledTimes(2)
})
