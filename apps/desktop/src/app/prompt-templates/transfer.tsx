import { randomUuid } from '@hermes/shared'
import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { parsePromptLibrary } from '@/lib/prompt-templates'
import { $promptLibrary, savePromptLibrary } from '@/store/prompt-templates'

export function TemplateTransfer() {
  const library = useStore($promptLibrary)
  const [mode, setMode] = useState<'import' | 'export' | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            setText('')
            setError('')
            setMode('import')
          }}
          variant="ghost"
        >
          Import JSON
        </Button>
        <Button
          onClick={() => {
            setText(JSON.stringify(library, null, 2))
            setError('')
            setMode('export')
          }}
          variant="ghost"
        >
          Export JSON
        </Button>
      </div>
      <Dialog
        onOpenChange={open => {
          if (!open) {
            setMode(null)
          }
        }}
        open={mode !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'import' ? 'Import templates' : 'Export templates'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {mode === 'import'
              ? 'Paste an exported library. Templates are added without replacing your current ones.'
              : 'Copy this JSON to back up or share your library. Filled-in chat details are not included.'}
          </p>
          <Textarea
            aria-label="Template library JSON"
            className="min-h-64"
            onChange={event => setText(event.target.value)}
            readOnly={mode === 'export'}
            value={text}
          />
          {error && <p role="alert">{error}</p>}
          {mode === 'import' && (
            <Button
              onClick={() => {
                try {
                  const imported = parsePromptLibrary(text)
                  const current = $promptLibrary.get()

                  if (
                    savePromptLibrary({
                      version: 1,
                      categories: [...new Set([...current.categories, ...imported.categories])],
                      templates: [
                        ...current.templates,
                        ...imported.templates.map(template => ({ ...template, id: randomUuid() }))
                      ]
                    })
                  ) {
                    setMode(null)
                  }
                } catch (failure) {
                  setError(String(failure))
                }
              }}
            >
              Import templates
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
