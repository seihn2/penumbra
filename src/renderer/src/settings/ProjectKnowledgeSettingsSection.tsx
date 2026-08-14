import { useCallback, useEffect, useState } from 'react'
import { DatabaseZap, FolderGit2, Loader2, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type {
  InterviewAnswerPolicy,
  ProjectKnowledgeActionResult,
  ProjectKnowledgeOverview
} from '../../../shared/project-knowledge'
import { SettingsSection } from './components'
import { ExternalKnowledgeSettings } from './ExternalKnowledgeSettings'
import { LocalKnowledgeDocuments } from './LocalKnowledgeDocuments'

interface PolicyDraft {
  question: string
  answer: string
}

export function ProjectKnowledgeSettingsSection() {
  const { t, i18n } = useTranslation()
  const [overview, setOverview] = useState<ProjectKnowledgeOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null)
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>({ question: '', answer: '' })

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      setOverview(await window.api.listProjectKnowledge())
    } catch (error) {
      toast.error(
        t('settings.projectKnowledge.actionFailed', {
          error: error instanceof Error ? error.message : 'unknown'
        })
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const showActionError = (error: unknown) => {
    toast.error(
      t('settings.projectKnowledge.actionFailed', {
        error: error instanceof Error ? error.message : 'unknown'
      })
    )
  }

  const applyActionResult = (
    result: ProjectKnowledgeActionResult | null,
    successMessage: string
  ): boolean => {
    if (!result) return false
    if (!result.ok) {
      toast.error(t('settings.projectKnowledge.actionFailed', { error: result.error }))
      return false
    }
    setOverview(result.overview)
    toast.success(successMessage)
    return true
  }

  const importProject = async () => {
    setBusyKey('import')
    try {
      applyActionResult(
        await window.api.importProjectKnowledge(),
        t('settings.projectKnowledge.importSuccess')
      )
    } catch (error) {
      showActionError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const reindexProject = async (projectId: string) => {
    setBusyKey(`reindex:${projectId}`)
    try {
      applyActionResult(
        await window.api.reindexProjectKnowledge(projectId),
        t('settings.projectKnowledge.reindexSuccess')
      )
    } catch (error) {
      showActionError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const removeProject = async (projectId: string) => {
    if (!window.confirm(t('settings.projectKnowledge.removeConfirm'))) return
    setBusyKey(`remove:${projectId}`)
    try {
      applyActionResult(
        await window.api.removeProjectKnowledge(projectId),
        t('settings.projectKnowledge.removeSuccess')
      )
    } catch (error) {
      showActionError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const startEditingPolicy = (policy: InterviewAnswerPolicy) => {
    setEditingPolicyId(policy.id)
    setPolicyDraft({ question: policy.question, answer: policy.answer })
  }

  const cancelEditingPolicy = () => {
    setEditingPolicyId(null)
    setPolicyDraft({ question: '', answer: '' })
  }

  const savePolicy = async () => {
    if (!editingPolicyId) return
    if (!policyDraft.question.trim() || !policyDraft.answer.trim()) {
      toast.error(t('settings.projectKnowledge.required'))
      return
    }
    setBusyKey(`policy:${editingPolicyId}`)
    try {
      const saved = await window.api.saveInterviewAnswerPolicy({
        id: editingPolicyId,
        question: policyDraft.question,
        answer: policyDraft.answer
      })
      setOverview((current) =>
        current
          ? {
              ...current,
              answerPolicies: current.answerPolicies.map((policy) =>
                policy.id === saved.id ? saved : policy
              )
            }
          : current
      )
      cancelEditingPolicy()
      toast.success(t('settings.projectKnowledge.saved'))
    } catch (error) {
      showActionError(error)
    } finally {
      setBusyKey(null)
    }
  }

  const deletePolicy = async (policyId: string) => {
    if (!window.confirm(t('settings.projectKnowledge.deletePolicyConfirm'))) return
    setBusyKey(`delete-policy:${policyId}`)
    try {
      const deleted = applyActionResult(
        await window.api.deleteInterviewAnswerPolicy(policyId),
        t('settings.projectKnowledge.deleted')
      )
      if (deleted && editingPolicyId === policyId) cancelEditingPolicy()
    } catch (error) {
      showActionError(error)
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
    <SettingsSection
      icon={DatabaseZap}
      title={t('settings.projectKnowledge.title')}
      description={t('settings.projectKnowledge.desc')}
    >
      <div className="settings-row">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="settings-row-title">{t('settings.projectKnowledge.sourcesTitle')}</div>
            <p className="settings-row-desc">{t('settings.projectKnowledge.sourcesDesc')}</p>
          </div>
          <Button type="button" size="sm" onClick={importProject} disabled={busyKey !== null}>
            {busyKey === 'import' ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderGit2 className="mr-1 h-3.5 w-3.5" />
            )}
            {t('settings.projectKnowledge.import')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-tertiary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('settings.projectKnowledge.loading')}
          </div>
        ) : overview && overview.projects.length > 0 ? (
          <div className="space-y-2">
            {overview.projects.map((project) => (
              <div
                key={project.id}
                className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-3)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {project.name}
                    </div>
                    <div
                      className="mt-1 truncate text-[11px] text-[var(--text-tertiary)]"
                      title={project.rootPath}
                    >
                      {project.rootPath}
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                      {t('settings.projectKnowledge.projectStats', {
                        files: project.fileCount,
                        chunks: project.chunkCount
                      })}
                      {' · '}
                      {t('settings.projectKnowledge.updatedAt', {
                        time: formatIndexedAt(project.indexedAt)
                      })}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--accent)]">
                      {t('settings.projectKnowledge.sourceGraphStats', {
                        symbols: project.symbolCount,
                        relations: project.relationCount
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => reindexProject(project.id)}
                      disabled={busyKey !== null}
                    >
                      {busyKey === `reindex:${project.id}` ? (
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
                      onClick={() => removeProject(project.id)}
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
            {t('settings.projectKnowledge.emptyProjects')}
          </div>
        )}
      </div>

      <LocalKnowledgeDocuments
        documents={overview?.documents ?? []}
        onOverviewChange={setOverview}
      />

      <ExternalKnowledgeSettings
        sources={overview?.externalSources ?? []}
        onOverviewChange={setOverview}
      />

      <div className="settings-row">
        <div>
          <div className="settings-row-title">{t('settings.projectKnowledge.policiesTitle')}</div>
          <p className="settings-row-desc">{t('settings.projectKnowledge.policiesDesc')}</p>
        </div>

        {overview && overview.answerPolicies.length > 0 ? (
          <div className="space-y-2">
            {overview.answerPolicies.map((policy) => {
              const editing = editingPolicyId === policy.id
              return (
                <div
                  key={policy.id}
                  className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-3)] p-3"
                >
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        className="settings-input"
                        value={policyDraft.question}
                        onChange={(event) =>
                          setPolicyDraft((current) => ({
                            ...current,
                            question: event.target.value
                          }))
                        }
                      />
                      <Textarea
                        value={policyDraft.answer}
                        onChange={(event) =>
                          setPolicyDraft((current) => ({
                            ...current,
                            answer: event.target.value
                          }))
                        }
                        rows={7}
                        className="border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditingPolicy}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          {t('settings.projectKnowledge.cancel')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={savePolicy}
                          disabled={busyKey !== null}
                        >
                          {busyKey === `policy:${policy.id}` ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-3.5 w-3.5" />
                          )}
                          {t('settings.projectKnowledge.save')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-medium text-[var(--text-primary)]">
                        {policy.question}
                      </div>
                      <div className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {policy.answer}
                      </div>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingPolicy(policy)}
                          disabled={busyKey !== null}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          {t('settings.projectKnowledge.edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePolicy(policy.id)}
                          disabled={busyKey !== null}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {t('settings.projectKnowledge.delete')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[var(--r-control)] border border-dashed border-[var(--hairline)] px-3 py-5 text-center text-xs text-[var(--text-tertiary)]">
            {t('settings.projectKnowledge.emptyPolicies')}
          </div>
        )}
      </div>

      <p className="settings-note settings-note-info">
        {t('settings.projectKnowledge.privacyNote')}
      </p>
    </SettingsSection>
  )
}
