import { registry } from '@/contrib/registry'

import { TemplateLibrary } from './library'
import { TemplateTransfer } from './transfer'

export function PromptTemplatesPage() {
  return (
    <main className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-xl font-semibold">Prompt templates</h1>
        <p className="text-sm text-muted-foreground">
          Your personal library on this desktop, shared across chats and projects. Insert templates through the chat
          box’s plus menu.
        </p>
      </header>
      <TemplateLibrary />
      <TemplateTransfer />
    </main>
  )
}

export function registerPromptTemplates() {
  registry.registerMany([
    {
      id: 'prompt-templates',
      area: 'routes',
      title: 'Prompt templates',
      data: { path: '/prompt-templates' },
      render: () => <PromptTemplatesPage />
    },
    {
      id: 'prompt-templates',
      area: 'sidebar.nav',
      data: { path: '/prompt-templates', codicon: 'note', label: 'Prompt templates' }
    }
  ])
}
