import { useState } from 'react'
import { Cloud, KeyRound, Loader2, Pencil, PlugZap, Plus, Save, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  EXTERNAL_KNOWLEDGE_DEFAULTS,
  type ExternalKnowledgeAuthType,
  type ExternalKnowledgeProtocol,
  type ExternalKnowledgeRole,
  type ExternalKnowledgeSourceInput,
  type ExternalKnowledgeSourceOverview
} from '../../../shared/external-knowledge'
import type {
  ProjectKnowledgeActionResult,
  ProjectKnowledgeOverview
} from '../../../shared/project-knowledge'

interface ExternalKnowledgeSettingsProps {
  sources: ExternalKnowledgeSourceOverview[]
  onOverviewChange: (overview: ProjectKnowledgeOverview) => void
}

function emptyDraft(): ExternalKnowledgeSourceInput {
  return {
    name: '',
    endpoint: '',
    enabled: true,
    protocol: EXTERNAL_KNOWLEDGE_DEFAULTS.protocol,
    role: EXTERNAL_KNOWLEDGE_DEFAULTS.role,
    authType: EXTERNAL_KNOWLEDGE_DEFAULTS.authType,
    headerName: EXTERNAL_KNOWLEDGE_DEFAULTS.headerName,
    namespace: '',
    topK: EXTERNAL_KNOWLEDGE_DEFAULTS.topK,
    timeoutMs: EXTERNAL_KNOWLEDGE_DEFAULTS.timeoutMs,
    queryField: EXTERNAL_KNOWLEDGE_DEFAULTS.queryField,
    limitField: EXTERNAL_KNOWLEDGE_DEFAULTS.limitField,
    namespaceField: EXTERNAL_KNOWLEDGE_DEFAULTS.namespaceField
  }
}

export function ExternalKnowledgeSettings({
  sources,
  onOverviewChange
}: ExternalKnowledgeSettingsProps) {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState<ExternalKnowledgeSourceInput | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const updateDraft = <K extends keyof ExternalKnowledgeSourceInput>(
    key: K,
    value: ExternalKnowledgeSourceInput[K]
  ) => setDraft((current) => (current ? { ...current, [key]: value } : current))

  const applyResult = (result: ProjectKnowledgeActionResult, successMessage: string): boolean => {
    if (!result.ok) {
      toast.error(t('settings.projectKnowledge.actionFailed', { error: result.error }))
      return false
    }
    onOverviewChange(result.overview)
    toast.success(successMessage)
    return true
  }

  const showUnexpectedError = (error: unknown) => {
    toast.error(
      t('settings.projectKnowledge.actionFailed', {
        error: error instanceof Error ? error.message : 'unknown'
      })
    )
  }

  const beginCreate = () => {
    setDraft(emptyDraft())
    setApiKey('')
  }

  const beginEdit = (source: ExternalKnowledgeSourceOverview) => {
    setDraft({
      id: source.id,
      name: source.name,
      endpoint: source.endpoint,
      enabled: source.enabled,
      protocol: source.protocol,
      role: source.role,
      authType: source.authType,
      headerName: source.headerName,
      namespace: source.namespace,
      topK: source.topK,
      timeoutMs: source.timeoutMs,
      queryField: source.queryField,
      limitField: source.limitField,
      namespaceField: source.namespaceField
    })
    setApiKey('')
  }

  const cancelEdit = () => {
    setDraft(null)
    setApiKey('')
  }

  const saveSource = async () => {
    if (!draft?.name.trim() || !draft.endpoint.trim()) {
      toast.error(t('settings.projectKnowledge.external.required'))
      return
    }
    setBusyKey('save-source')
    try {
      const result = await window.api.saveExternalKnowledgeSource({
        source: draft,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {})
      })
      if (applyResult(result, t('settings.projectKnowledge.external.saved'))) cancelEdit()
    } catch (error) {
      showUnexpectedError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    setBusyKey(`toggle:${sourceId}`)
    try {
      applyResult(
        await window.api.setExternalKnowledgeSourceEnabled(sourceId, enabled),
        enabled
          ? t('settings.projectKnowledge.external.enabled')
          : t('settings.projectKnowledge.external.disabled')
      )
    } catch (error) {
      showUnexpectedError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const testSource = async (sourceId: string) => {
    setBusyKey(`test:${sourceId}`)
    try {
      const result = await window.api.testExternalKnowledgeSource(sourceId)
      onOverviewChange(result.overview)
      if (result.ok) {
        toast.success(
          t('settings.projectKnowledge.external.testSuccess', { count: result.evidenceCount })
        )
      } else {
        toast.error(t('settings.projectKnowledge.external.testFailed', { error: result.error }))
      }
    } catch (error) {
      showUnexpectedError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const deleteSource = async (sourceId: string) => {
    if (!window.confirm(t('settings.projectKnowledge.external.deleteConfirm'))) return
    setBusyKey(`delete:${sourceId}`)
    try {
      applyResult(
        await window.api.deleteExternalKnowledgeSource(sourceId),
        t('settings.projectKnowledge.external.deleted')
      )
      if (draft?.id === sourceId) cancelEdit()
    } catch (error) {
      showUnexpectedError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const formatTestTime = (timestamp: number): string =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(timestamp)

  return (
    <div className="settings-row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="settings-row-title">{t('settings.projectKnowledge.external.title')}</div>
          <p className="settings-row-desc">{t('settings.projectKnowledge.external.desc')}</p>
        </div>
        {!draft && (
          <Button type="button" size="sm" onClick={beginCreate} disabled={busyKey !== null}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('settings.projectKnowledge.external.add')}
          </Button>
        )}
      </div>

      {draft && (
        <div className="space-y-3 rounded-[var(--r-control)] border border-[var(--accent-border)] bg-[var(--surface-3)] p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[var(--text-secondary)]">
              {t('settings.projectKnowledge.external.name')}
              <input
                className="settings-input mt-1"
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                placeholder={t('settings.projectKnowledge.external.namePlaceholder')}
              />
            </label>
            <label className="text-[11px] text-[var(--text-secondary)]">
              {t('settings.projectKnowledge.external.role')}
              <select
                className="settings-select mt-1"
                value={draft.role}
                onChange={(event) =>
                  updateDraft('role', event.target.value as ExternalKnowledgeRole)
                }
              >
                {(['project-fact', 'candidate-profile', 'user-voice', 'reference'] as const).map(
                  (role) => (
                    <option key={role} value={role}>
                      {t(`settings.projectKnowledge.external.roles.${role}`)}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <label className="block text-[11px] text-[var(--text-secondary)]">
            {t('settings.projectKnowledge.external.endpoint')}
            <input
              className="settings-input mt-1 font-mono text-xs"
              value={draft.endpoint}
              onChange={(event) => updateDraft('endpoint', event.target.value)}
              placeholder="https://kb.example.com/retrieve"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[var(--text-secondary)]">
              {t('settings.projectKnowledge.external.protocol')}
              <select
                className="settings-select mt-1"
                value={draft.protocol}
                onChange={(event) =>
                  updateDraft('protocol', event.target.value as ExternalKnowledgeProtocol)
                }
              >
                <option value="generic-json">
                  {t('settings.projectKnowledge.external.protocols.generic-json')}
                </option>
                <option value="dify">
                  {t('settings.projectKnowledge.external.protocols.dify')}
                </option>
              </select>
            </label>
            <label className="text-[11px] text-[var(--text-secondary)]">
              {t('settings.projectKnowledge.external.auth')}
              <select
                className="settings-select mt-1"
                value={draft.authType}
                onChange={(event) =>
                  updateDraft('authType', event.target.value as ExternalKnowledgeAuthType)
                }
              >
                {(['none', 'bearer', 'x-api-key', 'custom-header'] as const).map((auth) => (
                  <option key={auth} value={auth}>
                    {t(`settings.projectKnowledge.external.authTypes.${auth}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {draft.authType !== 'none' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  {t('settings.projectKnowledge.external.apiKey')}
                </span>
                <input
                  className="settings-input mt-1"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={
                    draft.id
                      ? t('settings.projectKnowledge.external.keyKeepPlaceholder')
                      : t('settings.projectKnowledge.external.keyPlaceholder')
                  }
                />
              </label>
              {draft.authType === 'custom-header' && (
                <label className="text-[11px] text-[var(--text-secondary)]">
                  {t('settings.projectKnowledge.external.headerName')}
                  <input
                    className="settings-input mt-1 font-mono text-xs"
                    value={draft.headerName ?? ''}
                    onChange={(event) => updateDraft('headerName', event.target.value)}
                    placeholder="X-API-Key"
                  />
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] text-[var(--text-secondary)]">
              {t('settings.projectKnowledge.external.namespace')}
              <input
                className="settings-input mt-1"
                value={draft.namespace ?? ''}
                onChange={(event) => updateDraft('namespace', event.target.value)}
                placeholder={t('settings.projectKnowledge.external.namespacePlaceholder')}
              />
            </label>
            <label className="text-[11px] text-[var(--text-secondary)]">
              Top K
              <input
                className="settings-input mt-1"
                type="number"
                min={1}
                max={10}
                value={draft.topK ?? EXTERNAL_KNOWLEDGE_DEFAULTS.topK}
                onChange={(event) => updateDraft('topK', Number(event.target.value))}
              />
            </label>
            <label className="text-[11px] text-[var(--text-secondary)]">
              {t('settings.projectKnowledge.external.timeout')}
              <input
                className="settings-input mt-1"
                type="number"
                min={500}
                max={8000}
                step={100}
                value={draft.timeoutMs ?? EXTERNAL_KNOWLEDGE_DEFAULTS.timeoutMs}
                onChange={(event) => updateDraft('timeoutMs', Number(event.target.value))}
              />
            </label>
          </div>

          {draft.protocol === 'generic-json' && (
            <details className="rounded-[var(--r-sm)] border border-[var(--hairline)] bg-[var(--surface-2)] p-2.5">
              <summary className="cursor-pointer text-[11px] font-medium text-[var(--text-secondary)]">
                {t('settings.projectKnowledge.external.advanced')}
              </summary>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="text-[10px] text-[var(--text-tertiary)]">
                  {t('settings.projectKnowledge.external.queryField')}
                  <input
                    className="settings-input mt-1 font-mono text-xs"
                    value={draft.queryField ?? ''}
                    onChange={(event) => updateDraft('queryField', event.target.value)}
                  />
                </label>
                <label className="text-[10px] text-[var(--text-tertiary)]">
                  {t('settings.projectKnowledge.external.limitField')}
                  <input
                    className="settings-input mt-1 font-mono text-xs"
                    value={draft.limitField ?? ''}
                    onChange={(event) => updateDraft('limitField', event.target.value)}
                  />
                </label>
                <label className="text-[10px] text-[var(--text-tertiary)]">
                  {t('settings.projectKnowledge.external.namespaceField')}
                  <input
                    className="settings-input mt-1 font-mono text-xs"
                    value={draft.namespaceField ?? ''}
                    onChange={(event) => updateDraft('namespaceField', event.target.value)}
                  />
                </label>
              </div>
            </details>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <Switch
                checked={draft.enabled}
                onCheckedChange={(enabled) => updateDraft('enabled', enabled)}
              />
              {t('settings.projectKnowledge.external.useInInterview')}
            </label>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="mr-1 h-3.5 w-3.5" />
                {t('settings.projectKnowledge.cancel')}
              </Button>
              <Button type="button" size="sm" onClick={saveSource} disabled={busyKey !== null}>
                {busyKey === 'save-source' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                {t('settings.projectKnowledge.external.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {sources.length > 0 ? (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-3)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {source.name}
                    </span>
                    <span className="rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                      {t(`settings.projectKnowledge.external.roles.${source.role}`)}
                    </span>
                  </div>
                  <div
                    className="mt-1 truncate font-mono text-[10px] text-[var(--text-tertiary)]"
                    title={source.endpoint}
                  >
                    {source.endpoint}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-secondary)]">
                    <span>
                      {t(`settings.projectKnowledge.external.protocols.${source.protocol}`)}
                    </span>
                    <span>
                      {source.authType === 'none'
                        ? t('settings.projectKnowledge.external.noKeyNeeded')
                        : source.keyConfigured
                          ? t('settings.projectKnowledge.external.keySaved', {
                              suffix: source.maskedKey
                            })
                          : t('settings.projectKnowledge.external.keyMissing')}
                    </span>
                    {source.lastTest && (
                      <span className={source.lastTest.ok ? 'text-emerald-400' : 'text-amber-400'}>
                        {source.lastTest.ok
                          ? t('settings.projectKnowledge.external.lastTestOk', {
                              count: source.lastTest.evidenceCount ?? 0,
                              time: formatTestTime(source.lastTest.at)
                            })
                          : t('settings.projectKnowledge.external.lastTestFailed', {
                              time: formatTestTime(source.lastTest.at)
                            })}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={source.enabled}
                  disabled={busyKey !== null}
                  onCheckedChange={(enabled) => void toggleSource(source.id, enabled)}
                />
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void testSource(source.id)}
                  disabled={
                    busyKey !== null || (source.authType !== 'none' && !source.keyConfigured)
                  }
                >
                  {busyKey === `test:${source.id}` ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="mr-1 h-3.5 w-3.5" />
                  )}
                  {t('settings.projectKnowledge.external.test')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => beginEdit(source)}
                  disabled={busyKey !== null}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {t('settings.projectKnowledge.edit')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void deleteSource(source.id)}
                  disabled={busyKey !== null}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {t('settings.projectKnowledge.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !draft && (
          <div className="rounded-[var(--r-control)] border border-dashed border-[var(--hairline)] px-3 py-5 text-center text-xs text-[var(--text-tertiary)]">
            {t('settings.projectKnowledge.external.empty')}
          </div>
        )
      )}
    </div>
  )
}
