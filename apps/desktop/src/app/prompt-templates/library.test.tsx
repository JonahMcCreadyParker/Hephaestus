import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { starterPrompts } from '@/lib/prompt-templates'
import { $promptLibrary, $promptLibraryError } from '@/store/prompt-templates'

import { TemplateLibrary } from './library'
import { PromptTemplatePicker } from './picker'

vi.mock('@/store/notifications', () => ({ notifyError: vi.fn() }))
afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  $promptLibrary.set(starterPrompts())
  $promptLibraryError.set('')
})

it('creates a template in a new category, persists it, and searches its body under that category', async () => {
  render(<TemplateLibrary />)
  fireEvent.click(screen.getByRole('button', { name: 'New template' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My check' } })
  fireEvent.change(screen.getByLabelText('Category name (existing or new)'), { target: { value: 'Operations' } })
  fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Inspect {{service}} for outages' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save template' }))
  await waitFor(() => expect($promptLibrary.get().categories).toContain('Operations'))
  fireEvent.change(screen.getByRole('textbox', { name: 'Search prompt templates' }), { target: { value: 'outages' } })
  expect(screen.getByText('Operations · 1')).toBeTruthy()
  expect(screen.queryByText('Inbox triage')).toBeNull()
  expect(localStorage.getItem('hermes:desktop:prompt-library:v1')).toContain('My check')
})

it('collapses only the selected category and lets it expand again', () => {
  render(<TemplateLibrary />)
  const email = screen.getByRole('button', { name: /Email & inbox/, expanded: true })

  fireEvent.click(email)
  expect(screen.getByRole('button', { name: /Email & inbox/, expanded: false })).toBe(email)
  expect(screen.queryByRole('heading', { name: 'Inbox triage' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Implementation plan' })).toBeTruthy()

  fireEvent.click(email)
  expect(screen.getByRole('button', { name: /Email & inbox/, expanded: true })).toBe(email)
  expect(screen.getByRole('heading', { name: 'Inbox triage' })).toBeTruthy()
})

it('requires placeholder details and inserts only after explicit confirmation', () => {
  const insert = vi.fn()

  render(<PromptTemplatePicker onInsertText={insert} onOpenChange={vi.fn()} open />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search prompt templates' }), {
    target: { value: 'Explain this' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Use template' }))
  expect((screen.getByRole('button', { name: 'Insert into chat' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('topic'), { target: { value: 'Caching' } })
  fireEvent.change(screen.getByLabelText('experience_level'), { target: { value: 'beginner' } })
  expect(insert).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Insert into chat' }))
  expect(insert).toHaveBeenCalledWith('Explain Caching at a beginner level, using a concrete example.')
})
