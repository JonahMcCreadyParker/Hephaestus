import { randomUuid } from '@hermes/shared'
import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { SearchField } from '@/components/ui/search-field'
import { groupedPrompts, type PromptTemplate } from '@/lib/prompt-templates'
import { $promptLibrary, $promptLibraryError, savePromptLibrary, savePromptTemplate } from '@/store/prompt-templates'

import { TemplateEditor } from './editor'

export function TemplateLibrary({ onChoose }: { onChoose?: (template: PromptTemplate) => void }) {
  const library = useStore($promptLibrary)
  const error = useStore($promptLibraryError)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [editing, setEditing] = useState<PromptTemplate | null>(null)
  const [deleting, setDeleting] = useState('')
  const groups = groupedPrompts(library, query, favorites)

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          aria-label="Search prompt templates"
          containerClassName="min-w-48 flex-1"
          onChange={setQuery}
          placeholder="Search prompts and categories"
          value={query}
        />
        <Button onClick={() => setFavorites(!favorites)} variant={favorites ? 'secondary' : 'ghost'}>
          Favorites
        </Button>
        <Button
          onClick={() =>
            setEditing({
              id: randomUuid(),
              title: '',
              category: library.categories[0] || 'General',
              body: '',
              favorite: false
            })
          }
        >
          New template
        </Button>
      </div>
      {error && (
        <p role="alert">Could not load saved templates: {error}. Your saved library has not been overwritten.</p>
      )}
      <div className="min-h-0 overflow-y-auto">
        {groups.length === 0 && (
          <p className="text-muted-foreground">No matching templates. Try a different search or create a template.</p>
        )}
        {groups.map(group => (
          <section className="mb-6" key={group.category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {group.category} · {group.templates.length}
            </h2>
            {group.templates.map(template => (
              <div className="flex flex-wrap items-center gap-2 py-3" key={template.id}>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{template.title}</h3>
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{template.body}</p>
                </div>
                {onChoose && (
                  <Button onClick={() => onChoose(template)} variant="secondary">
                    Use template
                  </Button>
                )}
                <Button
                  aria-label={`${template.favorite ? 'Unfavorite' : 'Favorite'} ${template.title}`}
                  onClick={() => savePromptTemplate({ ...template, favorite: !template.favorite })}
                  variant="ghost"
                >
                  {template.favorite ? '★' : '☆'}
                </Button>
                <Button onClick={() => setEditing(template)} variant="ghost">
                  Edit
                </Button>
                <Button
                  onClick={() => setEditing({ ...template, id: randomUuid(), title: `${template.title} (copy)` })}
                  variant="ghost"
                >
                  Duplicate
                </Button>
                <Button
                  onClick={() => {
                    if (deleting !== template.id) {
                      setDeleting(template.id)

                      return
                    }

                    if (
                      savePromptLibrary({
                        ...library,
                        templates: library.templates.filter(row => row.id !== template.id)
                      })
                    ) {
                      setDeleting('')
                    }
                  }}
                  variant="ghost"
                >
                  {deleting === template.id ? 'Confirm delete' : 'Delete'}
                </Button>
                {deleting === template.id && (
                  <Button onClick={() => setDeleting('')} variant="ghost">
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
      {editing && (
        <TemplateEditor
          categories={library.categories}
          key={editing.id}
          onClose={() => setEditing(null)}
          template={editing}
        />
      )}
    </div>
  )
}
