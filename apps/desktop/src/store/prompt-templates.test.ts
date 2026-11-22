import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { starterPrompts } from '@/lib/prompt-templates'
import { notifyError } from '@/store/notifications'

import { $promptLibrary, $promptLibraryError, savePromptLibrary, savePromptTemplate } from './prompt-templates'

vi.mock('@/store/notifications', () => ({ notifyError: vi.fn() }))
beforeEach(() => {
  $promptLibrary.set(starterPrompts())
  $promptLibraryError.set('')
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

it('persists edits, favorites, and reassignment without duplicating the template', () => {
  const original = $promptLibrary.get().templates[0]

  expect(savePromptTemplate({ ...original, title: 'Custom plan', category: 'Operations', favorite: true })).toBe(true)
  const saved = JSON.parse(localStorage.getItem('hermes:desktop:prompt-library:v1')!)

  expect(saved.templates.filter((row: { id: string }) => row.id === original.id)).toEqual([
    { ...original, title: 'Custom plan', category: 'Operations', favorite: true }
  ])
  expect(saved.categories).toContain('Operations')
})

it('reports storage failures without replacing the current library', () => {
  const before = $promptLibrary.get()

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage full')
  })
  expect(savePromptLibrary({ ...before, templates: [] })).toBe(false)
  expect($promptLibrary.get()).toBe(before)
  expect(notifyError).toHaveBeenCalled()
})
