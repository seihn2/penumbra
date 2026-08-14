import { useState } from 'react'
import { FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ExternalKnowledgeRole } from '../../../shared/external-knowledge'
import type { ProjectKnowledgeOverview } from '../../../shared/project-knowledge'

interface LocalKnowledgeDocumentsProps {
  documents: ProjectKnowledgeOverview['documents']
  onOverviewChange: (overview: ProjectKnowledgeOverview) => void
}

export function LocalKnowledgeDocuments({
  documents,
  onOverviewChange
}: LocalKnowledgeDocumentsProps) {
  const { t, i18n } = useTranslation()
  const [role, setRole] = useState<ExternalKnowledgeRole>('candidate-profile')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const showError = (error: unknown) => {
    toast.error(
      t('settings.projectKnowledge.actionFailed', {
        error: error instanceof Error ? error.message : 'unknown'
      })
    )
  }

  const importDocument = async () => {
    setBusyKey('import-document')
    try {
      const result = await window.api.importProjectKnowledgeDocument(role)
      if (!result) return
      if (!result.ok) {
        toast.error(t('settings.projectKnowledge.actionFailed', { error: result.error }))
        return
      }
      onOverviewChange(result.overview)
      toast.success(t('settings.projectKnowledge.materials.imported'))
    } catch (error) {
      showError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const reindexDocument = async (documentId: string) => {
    setBusyKey(`reindex-document:${documentId}`)
    try {
      const result = await window.api.reindexProjectKnowledgeDocument(documentId)
      if (!result.ok) {
        toast.error(t('settings.projectKnowledge.actionFailed', { error: result.error }))
        return
      }
      onOverviewChange(result.overview)
      toast.success(t('settings.projectKnowledge.materials.reindexed'))
    } catch (error) {
      showError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const removeDocument = async (documentId: string) => {
    if (!window.confirm(t('settings.projectKnowledge.materials.removeConfirm'))) return
    setBusyKey(`remove-document:${documentId}`)
    try {
      const result = await window.api.removeProjectKnowledgeDocument(documentId)
      if (!result.ok) {
        toast.error(t('settings.projectKnowledge.actionFailed', { error: result.error }))
        return
      }
      onOverviewChange(result.overview)
      toast.success(t('settings.projectKnowledge.materials.removed'))
    } catch (error) {
      showError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const formatIndexedAt = (timestamp: number): string =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(timestamp)

  return (
    <div className="settings-row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="settings-row-title">{t('settings.projectKnowledge.materials.title')}</div>
          <p className="settings-row-desc">{t('settings.projectKnowledge.materials.desc')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            className="settings-select !h-8 w-36 text-xs"
            value={role}
            onChange={(event) => setRole(event.target.value as ExternalKnowledgeRole)}
          >
            {(['candidate-profile', 'user-voice', 'project-fact', 'reference'] as const).map(
              (value) => (
                <option key={value} value={value}>
                  {t(`settings.projectKnowledge.external.roles.${value}`)}
                </option>
              )
            )}
          </select>
          <Button type="button" size="sm" onClick={importDocument} disabled={busyKey !== null}>
            {busyKey === 'import-document' ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3.5 w-3.5" />
            )}
            {t('settings.projectKnowledge.materials.import')}
          </Button>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-3)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {document.name}
                    </span>
                    <span className="rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                      {t(`settings.projectKnowledge.external.roles.${document.role}`)}
                    </span>
                  </div>
                  <div
                    className="mt-1 truncate text-[10px] text-[var(--text-tertiary)]"
                    title={document.filePath}
                  >
                    {document.filePath}
                  </div>
                  <div className="mt-2 text-[10px] text-[var(--text-secondary)]">
                    {t('settings.projectKnowledge.materials.stats', {
                      chunks: document.chunkCount,
                      time: formatIndexedAt(document.indexedAt)
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void reindexDocument(document.id)}
                    disabled={busyKey !== null}
                  >
                    {busyKey === `reindex-document:${document.id}` ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t('settings.projectKnowledge.reindex')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeDocument(document.id)}
                    disabled={busyKey !== null}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t('settings.projectKnowledge.remove')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--r-control)] border border-dashed border-[var(--hairline)] px-3 py-5 text-center text-xs text-[var(--text-tertiary)]">
          {t('settings.projectKnowledge.materials.empty')}
        </div>
      )}
    </div>
  )
}
