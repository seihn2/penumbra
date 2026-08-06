import { useMemo, useState } from 'react'
import { BriefcaseBusiness, Upload, Plus, Trash2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMemorySettings } from '@/lib/store/settings'
import {
  parseMemoryState,
  serializeMemoryState,
  activeProfilePromptText,
  getActiveProfile,
  createEmptyProfile,
  isProfileEmpty,
  type MemoryProfile,
  type MemoryState
} from '../../../shared/memory-profile'
import { SettingsSection } from './components'

// Structured fields rendered as labeled textareas, in display order.
const FIELDS: { key: keyof MemoryProfile; labelKey: string; rows: number }[] = [
  { key: 'targetRole', labelKey: 'settings.memory.fieldTargetRole', rows: 1 },
  { key: 'techStack', labelKey: 'settings.memory.fieldTechStack', rows: 2 },
  { key: 'projects', labelKey: 'settings.memory.fieldProjects', rows: 3 },
  { key: 'highlights', labelKey: 'settings.memory.fieldHighlights', rows: 2 },
  { key: 'avoid', labelKey: 'settings.memory.fieldAvoid', rows: 1 },
  { key: 'freeform', labelKey: 'settings.memory.fieldFreeform', rows: 3 }
]

const newId = (): string => {
  try {
    return crypto.randomUUID()
  } catch {
    return `p-${Date.now()}`
  }
}

export function MemorySettingsSection() {
  const { t } = useTranslation()
  const { userMemory, memoryProfiles, updateSetting } = useMemorySettings()

  // Derive the working state from the persisted JSON (seeded by the legacy blob
  // on first run). Local state mirrors it so edits feel immediate.
  const [state, setState] = useState<MemoryState>(() =>
    parseMemoryState(memoryProfiles, userMemory)
  )

  // Persist the whole memory state AND mirror the active profile's compiled text
  // into `userMemory` — the only field the AI prompt reads — so the main process
  // is untouched by the structured model.
  const commit = (next: MemoryState): void => {
    setState(next)
    updateSetting('memoryProfiles', serializeMemoryState(next))
    updateSetting('userMemory', activeProfilePromptText(next))
  }

  const active = getActiveProfile(state)
  const preview = useMemo(() => activeProfilePromptText(state), [state])

  const updateField = (key: keyof MemoryProfile, value: string): void => {
    const profiles = state.profiles.map((p) => (p.id === active.id ? { ...p, [key]: value } : p))
    commit({ ...state, profiles })
  }

  const switchProfile = (id: string): void => {
    commit({ ...state, activeProfileId: id })
  }

  const addProfile = (): void => {
    const profile = createEmptyProfile(newId(), t('settings.memory.newProfileName'))
    commit({ profiles: [...state.profiles, profile], activeProfileId: profile.id })
  }

  const deleteProfile = (id: string): void => {
    if (state.profiles.length <= 1) return
    const profiles = state.profiles.filter((p) => p.id !== id)
    const activeProfileId = id === state.activeProfileId ? profiles[0].id : state.activeProfileId
    commit({ profiles, activeProfileId })
  }

  const renameProfile = (id: string, name: string): void => {
    const profiles = state.profiles.map((p) => (p.id === id ? { ...p, name } : p))
    commit({ ...state, profiles })
  }

  const importFile = async (): Promise<void> => {
    const content = await window.api.selectAndReadTextFile()
    if (content != null && content.trim()) {
      const merged = active.freeform ? `${active.freeform}\n\n${content.trim()}` : content.trim()
      updateField('freeform', merged)
      toast.success(t('settings.memory.imported'))
    } else if (content != null) {
      toast.error(t('settings.memory.importEmpty'))
    }
  }

  return (
    <SettingsSection
      icon={BriefcaseBusiness}
      title={t('settings.memory.title')}
      description={t('settings.memory.desc')}
    >
      {/* Profile switcher: one chip per profile, plus an add button. */}
      <div className="mb-3">
        <div className="settings-row-title mb-2">{t('settings.memory.profiles')}</div>
        <div className="flex flex-wrap items-center gap-2">
          {state.profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => switchProfile(p.id)}
              className={`flex items-center gap-1.5 rounded-[var(--r-pill)] border px-3 py-1 text-xs transition-colors ${
                p.id === active.id
                  ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
              }`}
            >
              {p.id === active.id && <Check className="h-3 w-3" />}
              {p.name || t('settings.memory.unnamedProfile')}
            </button>
          ))}
          <button
            type="button"
            onClick={addProfile}
            title={t('settings.memory.addProfile')}
            aria-label={t('settings.memory.addProfile')}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--r-pill)] border border-[var(--hairline)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active profile editor. */}
      <div className="settings-row">
        <div className="flex items-center justify-between gap-2">
          <input
            value={active.name}
            onChange={(e) => renameProfile(active.id, e.target.value)}
            placeholder={t('settings.memory.profileNamePlaceholder')}
            className="settings-input !h-8 max-w-48"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={importFile}>
              <Upload className="mr-1 h-3.5 w-3.5" />
              {t('settings.memory.importFile')}
            </Button>
            {state.profiles.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => deleteProfile(active.id)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {t('settings.memory.deleteProfile')}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {FIELDS.map(({ key, labelKey, rows }) => (
            <div key={key}>
              <label className="settings-row-desc mb-1 block">{t(labelKey)}</label>
              <Textarea
                value={active[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={t(`${labelKey}Placeholder`)}
                className="border-[var(--hairline)] bg-[var(--surface-3)] text-[var(--text-primary)]"
                rows={rows}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Live preview: exactly what gets appended to the AI prompt. */}
      <div className="settings-row">
        <div className="settings-row-title">{t('settings.memory.preview')}</div>
        <p className="settings-row-desc">{t('settings.memory.previewDesc')}</p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-secondary)]">
          {isProfileEmpty(active) ? t('settings.memory.previewEmpty') : preview}
        </pre>
      </div>

      <p className="settings-note settings-note-info">{t('settings.memory.hint')}</p>
    </SettingsSection>
  )
}
