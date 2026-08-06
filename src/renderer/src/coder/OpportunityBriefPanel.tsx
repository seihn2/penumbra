import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Target, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/lib/store/settings'
import { getActiveProfile, parseMemoryState } from '../../../shared/memory-profile'
import { parseJobDescription, profileToCandidate } from '../../../shared/opportunity-brief-input'
import { buildBrief, type OpportunityBrief } from '../../../shared/opportunity-brief'
import { useModalDismiss } from './hooks/useModalDismiss'

type JdFields = {
  title: string
  company: string
  mustHave: string
  niceToHave: string
  keywords: string
}

const EMPTY_JD: JdFields = { title: '', company: '', mustHave: '', niceToHave: '', keywords: '' }

export function OpportunityBriefPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  const [jd, setJd] = useState<JdFields>(EMPTY_JD)
  const [brief, setBrief] = useState<OpportunityBrief | null>(null)

  const candidate = useMemo(() => {
    const store = useSettingsStore.getState()
    const profile = getActiveProfile(parseMemoryState(store.memoryProfiles, store.userMemory))
    return profileToCandidate(profile)
  }, [])

  const hasProfile =
    candidate.techStack.length > 0 ||
    candidate.projects.length > 0 ||
    candidate.strengths.length > 0
  const canBuild = jd.mustHave.trim().length > 0 || jd.keywords.trim().length > 0

  const generate = () => {
    setBrief(buildBrief(candidate, parseJobDescription(jd)))
  }

  const set =
    (key: keyof JdFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setJd((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('brief.title')}
        className="m-auto flex h-[80vh] w-[720px] flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-sm font-semibold">{t('brief.title')}</h1>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
            aria-label={t('header.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-[var(--hairline)]">
          {/* Left: JD inputs */}
          <div className="min-h-0 space-y-3 overflow-y-auto p-5">
            <p className="text-xs text-[var(--text-tertiary)]">{t('brief.intro')}</p>
            {!hasProfile && (
              <div className="rounded-[var(--r-control)] border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-500">
                {t('brief.noProfile')}
              </div>
            )}
            <Field label={t('brief.jobTitle')}>
              <input className="brief-input" value={jd.title} onChange={set('title')} />
            </Field>
            <Field label={t('brief.company')}>
              <input className="brief-input" value={jd.company} onChange={set('company')} />
            </Field>
            <Field label={t('brief.mustHave')} hint={t('brief.listHint')}>
              <textarea
                className="brief-input"
                rows={2}
                value={jd.mustHave}
                onChange={set('mustHave')}
              />
            </Field>
            <Field label={t('brief.niceToHave')} hint={t('brief.listHint')}>
              <textarea
                className="brief-input"
                rows={2}
                value={jd.niceToHave}
                onChange={set('niceToHave')}
              />
            </Field>
            <Field label={t('brief.keywords')} hint={t('brief.listHint')}>
              <textarea
                className="brief-input"
                rows={2}
                value={jd.keywords}
                onChange={set('keywords')}
              />
            </Field>
            <Button className="w-full" onClick={generate} disabled={!canBuild}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('brief.generate')}
            </Button>
          </div>

          {/* Right: generated brief */}
          <div className="min-h-0 overflow-y-auto p-5">
            {brief ? (
              <div className="space-y-3 text-xs">
                <BriefList title={t('brief.focusAreas')} items={brief.focusAreas} tone="accent" />
                <BriefList
                  title={t('brief.projectsToTell')}
                  items={brief.projectsToTell.map((p) => `${p.name} — ${p.why}`)}
                />
                <BriefList title={t('brief.keyMetrics')} items={brief.keyMetrics} />
                <BriefList title={t('brief.deepDives')} items={brief.deepDives} />
                <BriefList title={t('brief.likelyFollowUps')} items={brief.likelyFollowUps} />
                <BriefList title={t('brief.behavioral')} items={brief.behavioralMaterial} />
                <BriefList title={t('brief.questionsToAsk')} items={brief.questionsToAsk} />
                <BriefList title={t('brief.risks')} items={brief.risks} tone="warn" />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--text-tertiary)]">
                <Target className="h-8 w-8 opacity-40" />
                <p className="text-sm">{t('brief.emptyRight')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        {hint && <span className="text-[10px] text-[var(--text-tertiary)]">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function BriefList({
  title,
  items,
  tone
}: {
  title: string
  items: string[]
  tone?: 'accent' | 'warn'
}) {
  if (items.length === 0) return null
  const dot =
    tone === 'accent'
      ? 'bg-[var(--accent)]'
      : tone === 'warn'
        ? 'bg-amber-500'
        : 'bg-[var(--text-tertiary)]'
  return (
    <section className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
      <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">{title}</div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[var(--text-primary)]">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
