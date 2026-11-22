export interface PromptTemplate {
  id: string
  title: string
  category: string
  body: string
  favorite: boolean
}

export interface PromptLibrary {
  version: 1
  categories: string[]
  templates: PromptTemplate[]
}

export function promptFields(body: string): string[] {
  return [...new Set(Array.from(body.matchAll(/\{\{\s*([\w.-]+)(?:\|([^{}]*))?\s*\}\}/g), match => match[1]))]
}

export function fillPrompt(body: string, values: Record<string, string>): string {
  return body.replace(
    /\{\{\s*([\w.-]+)(?:\|([^{}]*))?\s*\}\}/g,
    (match, key: string, fallback?: string) =>
      (typeof values[key] === 'string' ? values[key].trim() : '') || fallback?.trim() || match
  )
}

export function groupedPrompts(library: PromptLibrary, query: string, favorites = false) {
  const term = query.trim().toLocaleLowerCase()

  return library.categories
    .map(category => ({
      category,
      templates: library.templates.filter(
        template =>
          template.category === category &&
          (!favorites || template.favorite) &&
          `${template.title}\n${template.body}\n${category}`.toLocaleLowerCase().includes(term)
      )
    }))
    .filter(group => group.templates.length > 0)
}

export function parsePromptLibrary(raw: string): PromptLibrary {
  const value = JSON.parse(raw) as PromptLibrary

  if (
    value?.version !== 1 ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.templates) ||
    !value.categories.every(category => typeof category === 'string' && category.trim()) ||
    new Set(value.categories).size !== value.categories.length ||
    !value.templates.every(
      template =>
        template &&
        typeof template.id === 'string' &&
        typeof template.title === 'string' &&
        template.title.trim() &&
        typeof template.body === 'string' &&
        template.body.trim() &&
        typeof template.favorite === 'boolean' &&
        value.categories.includes(template.category)
    ) ||
    new Set(value.templates.map(template => template.id)).size !== value.templates.length
  ) {
    throw new Error('Invalid prompt library. Expected a version 1 template export.')
  }

  return value
}

export function starterPrompts(): PromptLibrary {
  const examples = [
    [
      'Coding & development',
      'Implementation plan',
      'Plan an implementation for {{project_name}}: {{feature}}. Identify the affected code, risks, and meaningful tests before changing anything.'
    ],
    [
      'Code review & testing',
      'Review changes',
      'Review the changes in {{project_name}}, focusing on {{review_focus}}. Report actionable findings in severity order, with file references and suggested tests.'
    ],
    [
      'Email & inbox',
      'Inbox triage',
      'Using my connected email integration, summarize messages from {{time_period}}. Group by urgency and suggest next actions. Draft replies for my review; ask before sending anything.'
    ],
    [
      'Research',
      'Research a topic',
      'Research {{topic}} for {{audience}}. Use current primary sources, link supporting evidence, and distinguish facts from uncertainty.'
    ],
    [
      'Writing & communication',
      'Improve a draft',
      'Rewrite this for {{audience}} in a {{tone}} tone, preserving the meaning:\n\n{{draft}}'
    ],
    [
      'Planning & projects',
      'Project milestones',
      'Break {{project_name}} into milestones for {{goal}}. Include dependencies, risks, and clear completion criteria.'
    ],
    ['General', 'Explain this', 'Explain {{topic}} at a {{experience_level}} level, using a concrete example.']
  ]

  return {
    version: 1,
    categories: examples.map(([category]) => category),
    templates: examples.map(([category, title, body], index) => ({
      id: `example-${index}`,
      category,
      title,
      body,
      favorite: false
    }))
  }
}

export function promptDefaults(body: string): Record<string, string> {
  return Object.assign(
    Object.fromEntries(promptFields(body).map(field => [field, ''])),
    Object.fromEntries(
      Array.from(body.matchAll(/\{\{\s*([\w.-]+)\|([^{}]*)\}\}/g), match => [match[1], match[2].trim()])
    )
  )
}
