import { type ReactNode, useDeferredValue, useEffect, useMemo, useState } from 'react'

import { PanelEmpty } from '@/app/overlays/panel'
import { PageLoader } from '@/components/page-loader'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { useI18n } from '@/i18n'

import { CapabilitySearch } from '../ui/capability-search'

import { type CatalogEntry, type CatalogKind, catalogLabel } from './catalog-data'
import { CatalogDetail } from './catalog-detail'
import { CatalogDetailDialog } from './catalog-detail-dialog'

interface InstalledCatalogProps {
  actions?: ReactNode
  entries: CatalogEntry[]
  kind: CatalogKind
  notice?: ReactNode
  onQueryChange?: (value: string) => void
  pending?: boolean
  query?: string
  renderAction?: (entry: CatalogEntry) => ReactNode
  renderDetail?: (entry: CatalogEntry) => ReactNode
  selectedEntryId?: string | null
}

export function InstalledCatalog({
  actions,
  entries,
  kind,
  notice,
  onQueryChange,
  pending,
  query,
  renderAction,
  renderDetail,
  selectedEntryId
}: InstalledCatalogProps) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(selectedEntryId ?? null)
  const needle = useDeferredValue((query ?? '').trim().toLowerCase())

  const visible = useMemo(
    () => entries.filter(entry => entry.search.includes(needle)).sort((a, b) => a.name.localeCompare(b.name)),
    [entries, needle]
  )

  const selected = visible.find(entry => entry.id === selectedId)
  const scope = kind === 'skills' ? t.skills.tabSkills : t.skills.tabPlugins

  useEffect(() => {
    if (selectedEntryId) {
      setSelectedId(selectedEntryId)
    }
  }, [selectedEntryId])

  const search = (value: string) => {
    setSelectedId(null)
    onQueryChange?.(value)
  }

  return (
    <div className="capabilities-page flex min-h-0 flex-1 flex-col gap-3 pt-5" data-installed-catalog={kind}>
      <CapabilitySearch
        actions={actions}
        onChange={search}
        placeholder={kind === 'skills' ? t.catalog.searchSkills : t.catalog.searchPlugins}
        scope={scope}
        value={query ?? ''}
      />
      {notice}
      <div className="capabilities-scroll pb-4">
        {visible.length ? (
          <div className="installed-capability-grid">
            {visible.map(entry => (
              <article
                className="grid min-w-0 content-start gap-2 rounded-xl border border-(--ui-stroke-quaternary) bg-(--ui-bg-elevated) p-4"
                data-entry-id={entry.id}
                key={entry.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2>
                      <RowButton
                        aria-haspopup="dialog"
                        className="wrap-anywhere text-left text-sm font-semibold"
                        onClick={() => setSelectedId(entry.id)}
                      >
                        {entry.name}
                      </RowButton>
                    </h2>
                    {(entry.author || entry.source) && (
                      <p className="wrap-anywhere text-xs text-(--ui-text-tertiary)">
                        {entry.author || catalogLabel(entry.source)}
                      </p>
                    )}
                  </div>
                  {renderAction?.(entry)}
                </div>
                {entry.description && (
                  <p className="line-clamp-3 wrap-anywhere text-sm leading-relaxed text-(--ui-text-secondary)">
                    {entry.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : pending ? (
          !notice && <PageLoader label={t.skills.loading} />
        ) : (
          <PanelEmpty
            action={
              needle && (
                <Button onClick={() => search('')} size="sm" variant="secondary">
                  {t.catalog.clearFilters}
                </Button>
              )
            }
            icon={needle ? 'search' : 'extensions'}
            title={t.catalog.noResults}
          />
        )}
      </div>
      {selected && (
        <CatalogDetailDialog
          onOpenChange={open => !open && setSelectedId(null)}
          onSelect={setSelectedId}
          open
          order={visible}
          selectedId={selected.id}
        >
          <CatalogDetail
            action={renderAction?.(selected)}
            dialog
            entry={selected}
            kind={kind}
            management={renderDetail?.(selected)}
            related={[]}
          />
        </CatalogDetailDialog>
      )}
    </div>
  )
}
