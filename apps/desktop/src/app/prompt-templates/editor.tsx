import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PromptTemplate } from '@/lib/prompt-templates'
import { savePromptTemplate } from '@/store/prompt-templates'

export function TemplateEditor({
  template,
  categories,
  onClose
}: {
  template: PromptTemplate
  categories: string[]
  onClose: () => void
}) {
  const [draft, setDraft] = useState(template)

  return (
    <Dialog
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
      open
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template.title ? 'Edit template' : 'New template'}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault()

            if (savePromptTemplate(draft)) {
              onClose()
            }
          }}
        >
          <label className="grid gap-2">
            Title
            <Input onChange={event => setDraft({ ...draft, title: event.target.value })} required value={draft.title} />
          </label>
          <label className="grid gap-2">
            Existing category
            <Select
              onValueChange={category => setDraft({ ...draft, category })}
              value={categories.includes(draft.category) ? draft.category : ''}
            >
              <SelectTrigger aria-label="Existing category">
                <SelectValue placeholder="Choose an existing category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            Category name (existing or new)
            <Input
              onChange={event => setDraft({ ...draft, category: event.target.value })}
              required
              value={draft.category}
            />
          </label>
          <label className="grid gap-2">
            Prompt
            <Textarea
              className="min-h-48"
              onChange={event => setDraft({ ...draft, body: event.target.value })}
              required
              value={draft.body}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Use {'{{project_name}}'} for a required field or {'{{tone|friendly}}'} for a field with a default. Repeated
            fields are filled once.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={!draft.title.trim() || !draft.category.trim() || !draft.body.trim()} type="submit">
              Save template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
