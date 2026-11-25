import { describe, expect, it } from 'vitest'

import {
  addExpandedStarterPrompts,
  fillPrompt,
  groupedPrompts,
  parsePromptLibrary,
  promptDefaults,
  promptFields,
  starterPrompts
} from './prompt-templates'

describe('prompt templates', () => {
  it('adds two starters per genre once while preserving edits and deletions', () => {
    const { categories, templates } = starterPrompts()
    const edited = { ...templates[0], title: 'My plan', favorite: true }
    const library = addExpandedStarterPrompts({ version: 1, categories, templates: [edited] })

    expect(groupedPrompts(library, '').map(group => group.templates.length)).toEqual([3, 2, 2, 2, 2, 2, 2])
    expect(library.templates[0]).toEqual(edited)
    expect(library.templates.some(template => template.id === templates[1].id)).toBe(false)
    expect(addExpandedStarterPrompts(library)).toBe(library)
  })

  it('fills repeated fields literally without interpreting replacement syntax or nested placeholders', () => {
    const body = '{{project}}: {{tone|friendly}} / {{project}}'

    expect(promptFields(body)).toEqual(['project', 'tone'])
    expect(promptDefaults(body)).toEqual({ project: '', tone: 'friendly' })
    expect(fillPrompt(body, { project: '$& {{other}}' })).toBe('$& {{other}}: friendly / $& {{other}}')
  })

  it('searches titles, bodies, and category names while preserving genre grouping', () => {
    const library = starterPrompts()

    expect(groupedPrompts(library, 'Research').map(group => group.category)).toEqual(['Research'])
    expect(groupedPrompts(library, 'severity')[0].category).toBe('Code review & testing')
    expect(groupedPrompts(library, 'nothing-matches')).toEqual([])
    expect(groupedPrompts(library, '', true)).toEqual([])
    expect(parsePromptLibrary(JSON.stringify(library))).toEqual(library)
    expect(() => parsePromptLibrary('{"version":1,"categories":[],"templates":[{}]}')).toThrow()
  })
})
