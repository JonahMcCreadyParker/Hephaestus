export interface PromptTemplate {
  id: string
  title: string
  category: string
  body: string
  favorite: boolean
}

export interface PromptLibrary {
  version: 1
  starterRevision?: 1
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
    ['General', 'Explain this', 'Explain {{topic}} at a {{experience_level}} level, using a concrete example.'],
    [
      'Coding & development',
      'Diagnose a bug',
      'Trace {{symptom}} in {{project_name}}. Identify a likely cause, propose the smallest fix, and explain how to verify it.'
    ],
    [
      'Coding & development',
      'Map a codebase',
      'Map the entry points, main modules, and data flow for {{feature}} in {{project_name}}. Cite relevant files and explain where to start making changes.'
    ],
    [
      'Code review & testing',
      'Design regression tests',
      'Design regression tests for {{change}}. Cover the normal path, relevant edge cases, and failure recovery. List the expected result for each case.'
    ],
    [
      'Code review & testing',
      'Triage failing checks',
      'Analyze these failing checks and group them by likely root cause. Suggest the first diagnostic step for each group:\n\n{{test_output}}'
    ],
    [
      'Email & inbox',
      'Draft a reply',
      'Draft a {{tone|professional}} reply to {{message}}. Address {{key_points}} and flag anything I should verify before sending.'
    ],
    [
      'Email & inbox',
      'Summarize a thread',
      'Summarize {{email_thread}}. Extract decisions, unanswered questions, deadlines, and who owns each next action.'
    ],
    [
      'Research',
      'Compare sources',
      'Compare these sources on {{question}}: {{sources}}. Identify agreements, disagreements, evidence quality, and gaps. Cite each source by claim.'
    ],
    [
      'Research',
      'Plan a literature search',
      'Build a literature search plan for {{research_question}}. Suggest search terms, inclusion criteria, and a table for recording evidence.'
    ],
    [
      'Writing & communication',
      'Draft a status update',
      'Draft a status update for {{audience}} based on {{notes}}. Include progress, blockers, and the next decision needed.'
    ],
    [
      'Writing & communication',
      'Outline a presentation',
      'Outline a {{duration|5-minute}} presentation on {{topic}} for {{audience}}. Give each slide a takeaway and suggest supporting evidence.'
    ],
    [
      'Planning & projects',
      'Prioritize a backlog',
      'Prioritize {{tasks}} against {{goal}}. Explain impact, effort, and dependencies, then suggest the first three tasks.'
    ],
    [
      'Planning & projects',
      'Prepare a handoff',
      'Turn {{project_notes}} into a handoff for {{recipient}}. Include current state, relevant files, outstanding decisions, and the next action.'
    ],
    [
      'General',
      'Compare options',
      'Compare {{options}} using {{criteria}}. Summarize the practical tradeoffs and explain what information would change the choice.'
    ],
    [
      'General',
      'Turn notes into actions',
      'Organize {{notes}} into decisions, action items, and questions. Preserve any stated owners or deadlines.'
    ]
  ]

  return {
    version: 1,
    starterRevision: 1,
    categories: [...new Set(examples.map(([category]) => category))],
    templates: examples.map(([category, title, body], index) => ({
      id: `example-${index}`,
      category,
      title,
      body,
      favorite: false
    }))
  }
}

export function addExpandedStarterPrompts(library: PromptLibrary): PromptLibrary {
  if (library.starterRevision === 1) {
    return library
  }

  const existing = new Set(library.templates.map(template => template.id))
  const categories = new Set(library.categories)

  // Keep the seven original starter IDs out of the migration so a deletion stays deleted.
  const additions = starterPrompts()
    .templates.slice(7)
    .filter(template => categories.has(template.category) && !existing.has(template.id))

  return { ...library, starterRevision: 1, templates: [...library.templates, ...additions] }
}

export function promptDefaults(body: string): Record<string, string> {
  return Object.assign(
    Object.fromEntries(promptFields(body).map(field => [field, ''])),
    Object.fromEntries(
      Array.from(body.matchAll(/\{\{\s*([\w.-]+)\|([^{}]*)\}\}/g), match => [match[1], match[2].trim()])
    )
  )
}
