import { atom, onMount } from 'nanostores'

import {
  addExpandedStarterPrompts,
  parsePromptLibrary,
  type PromptLibrary,
  type PromptTemplate,
  starterPrompts
} from '@/lib/prompt-templates'
import { notifyError } from '@/store/notifications'

// Installation-wide personal library, shared across this desktop's profiles and projects.
const KEY = 'hermes:desktop:prompt-library:v1'
export const $promptLibrary = atom<PromptLibrary>(starterPrompts())
export const $promptLibraryError = atom('')

onMount($promptLibrary, () => {
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY)

      const library = raw ? parsePromptLibrary(raw) : starterPrompts()
      const expanded = addExpandedStarterPrompts(library)

      if (expanded !== library) {
        localStorage.setItem(KEY, JSON.stringify(expanded))
      }

      $promptLibrary.set(expanded)
      $promptLibraryError.set('')
    } catch (error) {
      $promptLibraryError.set(String(error))
    }
  }

  const changed = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      load()
    }
  }

  load()
  window.addEventListener('storage', changed)

  return () => window.removeEventListener('storage', changed)
})

export function savePromptLibrary(next: PromptLibrary): boolean {
  try {
    if ($promptLibraryError.get()) {
      throw new Error($promptLibraryError.get())
    }

    const checked = parsePromptLibrary(JSON.stringify(next))

    localStorage.setItem(KEY, JSON.stringify(checked))
    $promptLibrary.set(checked)

    return true
  } catch (error) {
    notifyError(error, 'Could not save prompt templates')

    return false
  }
}

export function savePromptTemplate(template: PromptTemplate): boolean {
  const library = $promptLibrary.get()

  return savePromptLibrary({
    ...library,
    categories: [...new Set([...library.categories, template.category.trim()])],
    templates: [
      ...library.templates.filter(row => row.id !== template.id),
      { ...template, category: template.category.trim() }
    ]
  })
}
