import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { fillPrompt, promptDefaults, promptFields, type PromptTemplate } from '@/lib/prompt-templates'

import { TemplateLibrary } from './library'

export function PromptTemplatePicker({
  open,
  onOpenChange,
  onInsertText
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsertText: (text: string) => void
}) {
  const inserted = useRef(false)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex max-h-[85vh] max-w-3xl flex-col overflow-y-auto"
        onCloseAutoFocus={event => {
          if (inserted.current) {
            event.preventDefault()
            inserted.current = false
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Prompt templates</DialogTitle>
          <DialogDescription>
            Choose a template, fill in its details, and insert it into your draft. Nothing is sent automatically.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PickerContent
            onInsert={text => {
              inserted.current = true
              onInsertText(text)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PickerContent({ onInsert }: { onInsert: (text: string) => void }) {
  const [selected, setSelected] = useState<PromptTemplate | null>(null)

  return selected ? (
    <TemplateFields key={selected.id} onBack={() => setSelected(null)} onInsert={onInsert} template={selected} />
  ) : (
    <TemplateLibrary onChoose={setSelected} />
  )
}

function TemplateFields({
  template,
  onBack,
  onInsert
}: {
  template: PromptTemplate
  onBack: () => void
  onInsert: (text: string) => void
}) {
  const [values, setValues] = useState<Record<string, string>>(promptDefaults(template.body))
  const fields = promptFields(template.body)
  const complete = fields.every(field => values[field]?.trim())

  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        event.preventDefault()

        if (complete) {
          onInsert(fillPrompt(template.body, values))
        }
      }}
    >
      <h2 className="font-medium">{template.title}</h2>
      {fields.map(field => (
        <label className="grid gap-2" key={field}>
          {field}
          <Textarea
            onChange={event => setValues({ ...values, [field]: event.target.value })}
            required
            value={values[field] || ''}
          />
        </label>
      ))}
      <label className="grid gap-2">
        Preview
        <Textarea className="min-h-32" readOnly value={fillPrompt(template.body, values)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button onClick={onBack} type="button" variant="ghost">
          Back
        </Button>
        <Button disabled={!complete} type="submit">
          Insert into chat
        </Button>
      </div>
    </form>
  )
}
