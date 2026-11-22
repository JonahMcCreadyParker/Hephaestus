import { describe, expect, it } from 'vitest'

import {
  fillPrompt,
  groupedPrompts,
  parsePromptLibrary,
  promptDefaults,
  promptFields,
  starterPrompts
} from './prompt-templates'

describe('prompt templates', () => {
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
