import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  Languages,
  MessageSquareText,
  Loader2,
  ListChecks,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  BrainCircuit,
  BookmarkCheck,
  BookmarkPlus,
  Mic2,
  Plus,
  ClipboardList,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useInterviewCoachPanelState, useTranscriptionStore } from '@/lib/store/transcription'
import { useSettingValue, useSettingsStore } from '@/lib/store/settings'
import { transcriptToMarkdown } from './transcript-export'
import { summarizeInterviewStats, isLowCandidateShare } from '../../../../shared/interview-stats'
import {
  parseMemoryState,
  serializeMemoryState,
  activeProfilePromptText,
  applyCandidatesToActive,
  isMemoryCandidateField,
  type MemoryCandidate
} from '../../../../shared/memory-profile'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import type { DebriefReport } from '../../../../shared/debrief-report'
import { deriveLivePhase, type LiveSessionPhase } from '../../../../shared/live-session-state'
import {
  createLayout,
  onTabVisited,
  setBadge,
  TAB_ORDER,
  type CoachTab
} from '../../../../shared/coach-layout'
import { useLiveSnapshot } from '../hooks/useLiveSnapshot'
import { useCaptureDiagnostics, formatElapsed } from '../hooks/useCaptureDiagnostics'
import { StructuredInterviewAssist } from './StructuredInterviewAssist'
import type { InterviewAnswerPolicy } from '../../../../shared/project-knowledge'
import { collectSpokenInterviewAnswer } from '../../../../shared/interview-answer-memory'

const priorityStyles = {
  high: 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--text-primary)]',
  medium: 'border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--text-primary)]',
  low: 'border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
}

// Priority → banner styling for stage suggestions.

// The coach is the primary workspace during an interview, not a narrow sidebar.
// Keep a useful slice of the answer canvas visible, but default the coach to a
// little over half the window so prompts can breathe and structure can scan.
const MIN_WIDTH_FRAC = 0.36
const MAX_WIDTH_FRAC = 0.78
const DEFAULT_WIDTH_FRAC = 0.54
const PANEL_WIDTH_KEY = 'penumbra-coach-width-v2'

const readPanelWidth = (): number => {
  try {
    const raw = localStorage.getItem(PANEL_WIDTH_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : window.innerWidth * DEFAULT_WIDTH_FRAC
  } catch {
    return window.innerWidth * DEFAULT_WIDTH_FRAC
  }
}

/** Clamp a pixel width to the configured fraction-of-window bounds. */
const clampPanelWidth = (px: number): number => {
  const min = window.innerWidth * MIN_WIDTH_FRAC
  const max = window.innerWidth * MAX_WIDTH_FRAC
  return Math.max(min, Math.min(max, px))
}

export function InterviewCoachPanel() {
  const { t } = useTranslation()
  // Always start expanded. Collapsing is a transient, in-session action — we
  // deliberately don't persist it, because a stuck "collapsed" flag from a
  // previous session left users staring at an empty sliver with no panel.
  const [collapsed, setCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() => readPanelWidth())
  const [pointsCopied, setPointsCopied] = useState(false)
  const [savingAnswerPolicy, setSavingAnswerPolicy] = useState(false)
  const [savedAnswerPolicyKey, setSavedAnswerPolicyKey] = useState<string | null>(null)
  const [answerPolicyConflict, setAnswerPolicyConflict] = useState<{
    key: string
    policy: InterviewAnswerPolicy
    answer: string
  } | null>(null)
  const [spokenAnswerDraft, setSpokenAnswerDraft] = useState<string | null>(null)
  // Index of the assist currently shown in the AI assist area. Browsing only
  // affects display; it never mutates the store.
  const [assistIndex, setAssistIndex] = useState(0)
  // Post-interview debrief (复盘) report, fetched on demand from the main process.
  const [debrief, setDebrief] = useState<DebriefReport | null>(null)
  // Single-column tabbed layout (coach-layout): which tab is shown + per-tab
  // count badges. Background arrivals bump a badge but never switch the tab
  // (shouldAutoSwitchTab is false by design).
  const [layout, setLayout] = useState(createLayout)
  const {
    isTranscribing,
    transcriptionText,
    translations,
    interviewCoach,
    assists,
    detectedQuestion,
    assistLoading,
    liveAssist,
    summary,
    memoryCandidates
  } = useInterviewCoachPanelState()
  const coachEnabled = useSettingValue('interviewCoachEnabled')
  const realtimeAssistEnabled = useSettingValue('realtimeAssistEnabled')
  const proactiveAssistEnabled = useSettingValue('proactiveAssistEnabled')
  const { elapsedSeconds, chunks, level } = useCaptureDiagnostics(isTranscribing)
  const liveSnapshot = useLiveSnapshot(isTranscribing)
  const livePhase = deriveLivePhase(liveSnapshot)

  // When a new assist arrives (the list grows), jump to the latest entry. Also
  // clamp the index whenever the list shrinks (e.g. after a session clear).
  useEffect(() => {
    setAssistIndex(assists.length > 0 ? assists.length - 1 : 0)
  }, [assists.length])

  // Keep per-tab badges in sync with content counts. A tab that is NOT active
  // shows a count of the items it holds; the active tab is always cleared (the
  // user is looking at it). Never switches tabs — reading lease is respected.
  const transcriptCount = interviewCoach.turns.length
  const historyCount = assists.length
  const laterCount = interviewCoach.suggestions.length
  useEffect(() => {
    setLayout((prev) => {
      let next = prev
      next = setBadge(next, 'transcript', prev.activeTab === 'transcript' ? 0 : transcriptCount)
      next = setBadge(next, 'history', prev.activeTab === 'history' ? 0 : historyCount)
      next = setBadge(next, 'later', prev.activeTab === 'later' ? 0 : laterCount)
      return next
    })
  }, [transcriptCount, historyCount, laterCount])

  // Computed before any early return so the hook order stays stable.
  const stats = useMemo(() => summarizeInterviewStats(interviewCoach.turns), [interviewCoach.turns])

  const speakerLabels = {
    interviewer: t('coach.speakerInterviewer'),
    candidate: t('coach.speakerCandidate'),
    unknown: t('coach.speakerUnknown')
  }

  // Show the panel for live coaching (when enabled and transcribing) or
  // whenever there are translations. With coaching off and no translations
  // there's nothing to show, so don't reserve the screen space.
  const panelEnabled = coachEnabled || realtimeAssistEnabled || proactiveAssistEnabled
  const hasRetainedContent =
    Boolean(transcriptionText) ||
    detectedQuestion != null ||
    assistLoading ||
    Boolean(liveAssist) ||
    assists.length > 0 ||
    Boolean(summary)
  const showCoach = panelEnabled && (isTranscribing || hasRetainedContent)
  if (!showCoach && translations.length === 0) return null

  const timeline = interviewCoach.turns
  const candidatePct = Math.round(stats.candidateShare * 100)
  // Warn the candidate they're speaking too little — only once there's enough
  // spoken content for the ratio to be meaningful (avoids early false alarms).
  const lowCandidateShare = isLowCandidateShare(stats)
  // Map each transcript line to its translation (by source text) so the
  // translation can render inline under the turn instead of in a separate box.
  const translationByText = new Map(translations.map((item) => [item.sourceText.trim(), item]))
  const hasTranslations = translations.length > 0
  const fmtTime = (ts: number): string => {
    const d = new Date(ts)
    const p = (n: number): string => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }
  const canExport =
    interviewCoach.turns.length > 0 || assists.length > 0 || summary.trim().length > 0
  const exportTranscript = async () => {
    const md = transcriptToMarkdown(interviewCoach.turns, assists, summary)
    if (!md) return
    const ok = await window.api.exportConversationMarkdown(md, 'interview')
    if (ok) toast.success(t('coach.exported'))
  }
  // Clamp the browse index so render is safe even before the effect runs.
  const safeAssistIndex = assists.length > 0 ? Math.min(assistIndex, assists.length - 1) : 0
  const currentAssist = assists[safeAssistIndex]
  const detectedQuestionAnswered = detectedQuestion
    ? assists.some(
        (assist) =>
          assist.turnId === detectedQuestion.turnId && assist.revision === detectedQuestion.revision
      )
    : false
  const copyCurrentPoints = async () => {
    const points = currentAssist?.points
    if (!points) return
    try {
      await navigator.clipboard.writeText(points)
      setPointsCopied(true)
      toast.success(t('coach.pointsCopied'))
      setTimeout(() => setPointsCopied(false), 1500)
    } catch {
      // Clipboard write can fail (permissions / unsupported); skip success toast.
    }
  }
  const currentAnswerPolicyKey = currentAssist
    ? `${currentAssist.question}\n${currentAssist.points}`
    : null
  const nextAssistTimestamp = assists[safeAssistIndex + 1]?.timestamp ?? Number.POSITIVE_INFINITY
  const spokenAnswerText = currentAssist
    ? collectSpokenInterviewAnswer({
        turns: timeline,
        questionTimestamp: currentAssist.timestamp,
        nextQuestionTimestamp: nextAssistTimestamp
      })
    : ''
  const spokenAnswerPolicyKey = currentAssist
    ? `${currentAssist.question}\n${spokenAnswerDraft ?? spokenAnswerText}`
    : null
  const onPolicySaved = (key: string) => {
    setSavedAnswerPolicyKey(key)
    setAnswerPolicyConflict(null)
    if (spokenAnswerPolicyKey === key) setSpokenAnswerDraft(null)
  }
  const persistAnswerPolicy = async (
    answer: string,
    key: string,
    existingPolicyId?: string
  ): Promise<boolean> => {
    if (!currentAssist || !answer.trim()) return false
    setSavingAnswerPolicy(true)
    try {
      await window.api.saveInterviewAnswerPolicy({
        id: existingPolicyId,
        question: currentAssist.question,
        answer: answer.trim()
      })
      onPolicySaved(key)
      toast.success(t('coach.answerPolicySaved'))
      return true
    } catch (error) {
      toast.error(
        t('coach.answerPolicySaveFailed', {
          error: error instanceof Error ? error.message : 'unknown'
        })
      )
      return false
    } finally {
      setSavingAnswerPolicy(false)
    }
  }
  const proposeAnswerPolicy = async (answer: string, key: string): Promise<boolean> => {
    if (!currentAssist || !answer.trim() || savingAnswerPolicy) return false
    setSavingAnswerPolicy(true)
    try {
      const existing = await window.api.findInterviewAnswerPolicy(currentAssist.question)
      if (existing && existing.answer.trim() !== answer.trim()) {
        setAnswerPolicyConflict({ key, policy: existing, answer: answer.trim() })
        return false
      }
      if (existing) {
        onPolicySaved(key)
        toast.success(t('coach.answerPolicyRemembered'))
        return true
      }
    } catch (error) {
      toast.error(
        t('coach.answerPolicySaveFailed', {
          error: error instanceof Error ? error.message : 'unknown'
        })
      )
      return false
    } finally {
      setSavingAnswerPolicy(false)
    }
    return persistAnswerPolicy(answer, key)
  }
  const saveCurrentAnswerPolicy = async () => {
    if (!currentAssist || !currentAnswerPolicyKey) return
    await proposeAnswerPolicy(currentAssist.points, currentAnswerPolicyKey)
  }
  const saveSpokenAnswerPolicy = async () => {
    if (!spokenAnswerDraft?.trim() || !spokenAnswerPolicyKey) return
    await proposeAnswerPolicy(spokenAnswerDraft, spokenAnswerPolicyKey)
  }
  const clearSession = () => {
    useTranscriptionStore.getState().clearText()
  }
  const openDebrief = async () => {
    const report = await window.api.getDebriefReport()
    setDebrief(report)
  }
  const switchTab = (tab: CoachTab) => setLayout((prev) => onTabVisited(prev, tab))

  // Save one (or all) distilled candidate(s) into the active memory profile and
  // remove them from the pending bar. Writing goes through the same pure merge
  // helper the settings UI uses, then mirrors the compiled text into userMemory.
  const saveCandidates = (toSave: MemoryCandidate[]): void => {
    if (toSave.length === 0) return
    const store = useSettingsStore.getState()
    const state = parseMemoryState(store.memoryProfiles, store.userMemory)
    const next = applyCandidatesToActive(state, toSave)
    store.updateSetting('memoryProfiles', serializeMemoryState(next))
    store.updateSetting('userMemory', activeProfilePromptText(next))
    const savedKeys = new Set(toSave.map((c) => `${c.field}::${c.text.toLowerCase()}`))
    const remaining = memoryCandidates.filter(
      (c) => !savedKeys.has(`${c.field}::${c.text.toLowerCase()}`)
    )
    useTranscriptionStore.setState({ memoryCandidates: remaining })
    toast.success(t('coach.memorySaved', { count: toSave.length }))
  }
  const dismissCandidates = (): void => {
    useTranscriptionStore.getState().clearMemoryCandidates()
  }
  // Only render well-formed candidates (defensive: the field must be a known
  // profile slot for the merge to land somewhere).
  const validCandidates: MemoryCandidate[] = memoryCandidates
    .filter((c) => isMemoryCandidateField(c.field))
    .map((c) => ({ field: c.field as MemoryCandidate['field'], text: c.text }))
  const candidateFieldLabel = (field: MemoryCandidate['field']): string =>
    t(
      `settings.memory.field${field.charAt(0).toUpperCase()}${field.slice(1)}` as Parameters<
        typeof t
      >[0]
    )

  // Collapsed: a slim icon-only rail that is itself the expand button. No
  // vertical text (it read poorly); the title shows on hover instead. Default
  // is expanded, so this only appears after the user deliberately collapses.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title={`${showCoach ? t('coach.title') : t('coach.liveTranslation')} · ${t('coach.expand')}`}
        aria-label={t('coach.expand')}
        className="flex h-full w-11 shrink-0 cursor-pointer flex-col items-center gap-4 border-l border-[var(--hairline)] bg-[var(--surface-1)] py-3.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[var(--r-control)] bg-[var(--surface-3)]">
          <ChevronLeft className="h-4 w-4" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-[var(--r-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <MessageSquareText className="h-4 w-4" />
        </span>
        {isTranscribing && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </button>
    )
  }

  // Drag the left edge to resize. Width is clamped to the fraction bounds and
  // persisted so it survives reloads.
  const startResize = (e: ReactMouseEvent): void => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panelWidth
    let latest = startWidth
    const onMove = (ev: MouseEvent): void => {
      // Panel sits on the right, so dragging left (smaller clientX) widens it.
      latest = clampPanelWidth(startWidth + (startX - ev.clientX))
      setPanelWidth(latest)
    }
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      try {
        localStorage.setItem(PANEL_WIDTH_KEY, String(latest))
      } catch {
        // storage unavailable; skip persistence
      }
    }
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className="interview-coach-shell relative flex h-full shrink-0 flex-col overflow-hidden border-l border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)]"
      style={{ width: `${clampPanelWidth(panelWidth)}px` }}
    >
      <div
        onMouseDown={startResize}
        title={t('coach.resizeHint')}
        className="interview-coach-resizer absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize"
      />
      <div className="interview-coach-header flex shrink-0 select-none items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div className="interview-coach-title flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-[var(--accent)]" />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              {showCoach ? t('coach.title') : t('coach.liveTranslation')}
              {isTranscribing && (
                <span
                  className="relative flex h-2 w-2"
                  title={t('coach.recording')}
                  aria-label={t('coach.recording')}
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
            </div>
            {showCoach && (
              <div className="text-[11px] text-[var(--text-tertiary)]">
                {isTranscribing ? t('coach.recording') : t('coach.subtitle')}
              </div>
            )}
          </div>
        </div>
        {showCoach && (
          <div className="interview-coach-tools flex items-center gap-2">
            {canExport && (
              <button
                type="button"
                onClick={exportTranscript}
                title={t('coach.exportTranscript')}
                aria-label={t('coach.exportTranscript')}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            {canExport && (
              <button
                type="button"
                onClick={openDebrief}
                title={t('coach.debrief.open')}
                aria-label={t('coach.debrief.open')}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              >
                <ClipboardList className="h-3.5 w-3.5" />
              </button>
            )}
            {canExport && (
              <button
                type="button"
                onClick={clearSession}
                title={t('coach.clearSession')}
                aria-label={t('coach.clearSession')}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-2 py-1 text-[11px] text-[var(--accent)]">
              {isTranscribing ? <LiveStateCapsule phase={livePhase} /> : interviewCoach.stageLabel}
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title={t('coach.collapse')}
              className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {showCoach && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Compact status strip: secondary info (speaker / language / confidence
              / speaking share) compressed into a single row instead of large boxes. */}
          <div className="interview-coach-status flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--hairline)] px-4 py-2 text-[11px] text-[var(--text-tertiary)]">
            {isTranscribing && (
              <span
                className="flex items-center gap-1.5"
                title={t('transcription.diagChunks', { count: chunks })}
              >
                <span className="font-medium tabular-nums text-red-400">
                  {formatElapsed(elapsedSeconds)}
                </span>
                <span className="tabular-nums">{chunks}</span>
                <span className="relative h-1.5 w-8 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-fill)] transition-[width] duration-100"
                    style={{ width: `${Math.min(100, Math.round(level * 200))}%` }}
                  />
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span>{t('coach.speaker')}</span>
              <span className="font-medium text-[var(--text-secondary)]">
                {speakerLabels[interviewCoach.currentSpeaker]}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span>{t('coach.language')}</span>
              <span className="font-medium uppercase text-[var(--text-secondary)]">
                {interviewCoach.language}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span>{t('coach.confidence')}</span>
              <span className="font-medium tabular-nums text-[var(--text-secondary)]">
                {Math.round(interviewCoach.confidence * 100)}%
              </span>
            </span>
            {stats.interviewerChars + stats.candidateChars > 0 && (
              <span
                className="flex items-center gap-1.5"
                title={`${t('coach.speakingShare')}: ${t('coach.speakerCandidate')} ${candidatePct}% · ${t('coach.speakerInterviewer')} ${100 - candidatePct}%`}
              >
                <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <span className="bg-[var(--accent-fill)]" style={{ width: `${candidatePct}%` }} />
                  <span
                    className="bg-[var(--text-tertiary)]"
                    style={{ width: `${100 - candidatePct}%` }}
                  />
                </span>
                <span className="tabular-nums">
                  {t('coach.speakerCandidate')} {candidatePct}%
                </span>
              </span>
            )}
          </div>
          {lowCandidateShare && (
            <div className="shrink-0 border-b border-[var(--hairline)] bg-[var(--accent-soft)] px-4 py-1 text-[10px] leading-snug text-[var(--accent)]">
              {t('coach.lowShareHint')}
            </div>
          )}

          {/* Confirm-gated memory distillation: facts the AI noticed about the
              candidate, shown for explicit save (per item or all) — never
              auto-written. Only appears when distillation surfaced something. */}
          {validCandidates.length > 0 && (
            <div className="shrink-0 border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  <BrainCircuit className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {t('coach.memoryFound', { count: validCandidates.length })}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => saveCandidates(validCandidates)}
                    className="rounded-[var(--r-pill)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] text-[var(--accent)] transition-colors hover:bg-[var(--accent-hover)]"
                  >
                    {t('coach.memorySaveAll')}
                  </button>
                  <button
                    type="button"
                    onClick={dismissCandidates}
                    title={t('coach.memoryDismiss')}
                    aria-label={t('coach.memoryDismiss')}
                    className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {validCandidates.map((c, i) => (
                  <div
                    key={`${c.field}-${i}`}
                    className="flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--surface-3)] px-2 py-1 text-xs"
                  >
                    <span className="shrink-0 rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                      {candidateFieldLabel(c.field)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                      {c.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => saveCandidates([c])}
                      title={t('coach.memorySaveOne')}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single-column tabbed body (coach-layout): one tab at a time with
              count badges. now = AI assist, transcript = live transcript,
              history = past answer points, later = suggestions/summary. */}
          <div className="interview-coach-tabs flex shrink-0 items-center gap-1 border-b border-[var(--hairline)] px-2 py-1.5">
            {TAB_ORDER.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                className={cn(
                  'interview-coach-tab flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] px-2.5 py-1 text-[11px] font-medium transition-colors',
                  layout.activeTab === tab
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                )}
              >
                {t(`coach.tab.${tab}`)}
                {layout.badges[tab] > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--surface-3)] px-1 text-[9px] tabular-nums text-[var(--text-tertiary)]">
                    {layout.badges[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="interview-coach-scroll min-h-0 flex-1 overflow-y-auto">
            {layout.activeTab === 'now' && (
              <div className="interview-coach-now space-y-3 px-3 py-2">
                <section className="interview-coach-answer space-y-2">
                  <div className="interview-coach-answer-header flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                      <ListChecks className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {t('coach.aiAssist')}
                    </div>
                    <div className="flex items-center gap-1">
                      {assists.length > 0 && (
                        <button
                          type="button"
                          onClick={copyCurrentPoints}
                          title={t('coach.copyPoints')}
                          aria-label={t('coach.copyPoints')}
                          className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                        >
                          {pointsCopied ? (
                            <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => window.api.requestInterviewAssist()}
                        disabled={assistLoading}
                        className="interview-coach-refresh flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] text-[var(--accent)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                      >
                        {assistLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ListChecks className="h-3 w-3" />
                        )}
                        {t('coach.askAi')}
                      </button>
                    </div>
                  </div>
                  {detectedQuestion && (
                    <div className="coach-question-card">
                      <div className="coach-question-label">{t('coach.detectedQuestion')}</div>
                      <div className="coach-question-text">{detectedQuestion.question}</div>
                    </div>
                  )}
                  {assistLoading && liveAssist ? (
                    <StructuredInterviewAssist content={liveAssist} streaming />
                  ) : detectedQuestion && !detectedQuestionAnswered ? (
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {t('coach.detectedQuestionWaiting')}
                    </div>
                  ) : currentAssist ? (
                    <div className="coach-answer-stack space-y-2">
                      {assists.length > 1 && (
                        <div className="mb-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setAssistIndex((i) => Math.max(0, i - 1))}
                            disabled={safeAssistIndex <= 0}
                            title={t('coach.prevPoint')}
                            className="flex h-5 w-5 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] disabled:opacity-40"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">
                            {t('coach.pointIndex', {
                              current: safeAssistIndex + 1,
                              total: assists.length
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAssistIndex((i) => Math.min(assists.length - 1, i + 1))
                            }
                            disabled={safeAssistIndex >= assists.length - 1}
                            title={t('coach.nextPoint')}
                            className="flex h-5 w-5 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] disabled:opacity-40"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="coach-question-context">{currentAssist.question}</div>
                      <StructuredInterviewAssist content={currentAssist.points} />
                      <button
                        type="button"
                        onClick={saveCurrentAnswerPolicy}
                        disabled={
                          savingAnswerPolicy || savedAnswerPolicyKey === currentAnswerPolicyKey
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-default disabled:opacity-70"
                      >
                        {savedAnswerPolicyKey === currentAnswerPolicyKey ? (
                          <BookmarkCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                        ) : savingAnswerPolicy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BookmarkPlus className="h-3.5 w-3.5" />
                        )}
                        {savedAnswerPolicyKey === currentAnswerPolicyKey
                          ? t('coach.answerPolicyRemembered')
                          : t('coach.rememberAnswerPolicy')}
                      </button>
                      {spokenAnswerText && spokenAnswerDraft === null && (
                        <button
                          type="button"
                          onClick={() => setSpokenAnswerDraft(spokenAnswerText)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                        >
                          <Mic2 className="h-3.5 w-3.5" />
                          {t('coach.rememberSpokenAnswer')}
                        </button>
                      )}
                      {spokenAnswerDraft !== null && (
                        <div className="rounded-[var(--r-control)] border border-[var(--accent-border)] bg-[var(--surface-2)] p-2.5">
                          <div className="text-[11px] font-medium text-[var(--text-primary)]">
                            {t('coach.spokenAnswerTitle')}
                          </div>
                          <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                            {t('coach.spokenAnswerDesc')}
                          </div>
                          <Textarea
                            value={spokenAnswerDraft}
                            onChange={(event) => setSpokenAnswerDraft(event.target.value)}
                            rows={5}
                            className="mt-2 border-[var(--hairline)] bg-[var(--surface-3)] text-xs text-[var(--text-primary)]"
                          />
                          <div className="mt-2 flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSpokenAnswerDraft(null)}
                              className="rounded-[var(--r-sm)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                            >
                              {t('settings.projectKnowledge.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveSpokenAnswerPolicy()}
                              disabled={savingAnswerPolicy || !spokenAnswerDraft.trim()}
                              className="rounded-[var(--r-sm)] bg-[var(--accent-fill)] px-2 py-1 text-[10px] text-[var(--accent-foreground)] disabled:opacity-50"
                            >
                              {t('coach.saveSpokenAnswer')}
                            </button>
                          </div>
                        </div>
                      )}
                      {answerPolicyConflict &&
                        (answerPolicyConflict.key === currentAnswerPolicyKey ||
                          answerPolicyConflict.key === spokenAnswerPolicyKey) && (
                          <div className="rounded-[var(--r-control)] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-2.5">
                            <div className="text-[11px] font-medium text-[var(--text-primary)]">
                              {t('coach.answerPolicyConflict')}
                            </div>
                            <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                              {t('coach.answerPolicyPrevious')}
                            </div>
                            <div className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded-[var(--r-sm)] bg-[var(--surface-2)] p-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                              {answerPolicyConflict.policy.answer}
                            </div>
                            <div className="mt-2 flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setAnswerPolicyConflict(null)}
                                className="rounded-[var(--r-sm)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                              >
                                {t('coach.answerPolicyKeepPrevious')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void persistAnswerPolicy(
                                    answerPolicyConflict.answer,
                                    answerPolicyConflict.key,
                                    answerPolicyConflict.policy.id
                                  )
                                }
                                disabled={savingAnswerPolicy}
                                className="rounded-[var(--r-sm)] bg-[var(--accent-fill)] px-2 py-1 text-[10px] text-[var(--accent-foreground)] disabled:opacity-50"
                              >
                                {t('coach.answerPolicyReplace')}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {assistLoading ? t('coach.aiAssistLoading') : t('coach.aiAssistEmpty')}
                    </div>
                  )}
                </section>
              </div>
            )}

            {layout.activeTab === 'transcript' && (
              <div className="space-y-2 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {t('coach.liveTranscript')}
                </div>
                {timeline.length > 0 ? (
                  timeline.map((turn) => (
                    <div
                      key={turn.id}
                      className="rounded-[var(--r-sm)] bg-[var(--surface-3)] p-2 text-xs leading-relaxed"
                    >
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)]">
                          {speakerLabels[turn.speaker]}
                        </span>
                        <span className="ml-auto text-[10px] tabular-nums text-[var(--text-tertiary)]">
                          {fmtTime(turn.timestamp)}
                        </span>
                      </div>
                      <span className={turn.isPartial ? 'text-[var(--text-secondary)]' : ''}>
                        {turn.text}
                      </span>
                      {translationByText.has(turn.text.trim()) && (
                        <div className="mt-1 border-l-2 border-[var(--accent-border)] pl-2 text-[var(--accent)]">
                          {translationByText.get(turn.text.trim())!.translatedText}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {t('coach.waitingVoice')}
                  </div>
                )}
              </div>
            )}

            {layout.activeTab === 'history' && (
              <div className="space-y-2 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('coach.tab.history')}
                </div>
                {assists.length > 0 ? (
                  assists.map((assist, i) => (
                    <div
                      key={`${assist.timestamp}-${i}`}
                      className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed"
                    >
                      <div className="mb-1 text-[10px] text-[var(--text-tertiary)]">
                        {assist.question.slice(0, 60)}
                      </div>
                      <StructuredInterviewAssist content={assist.points} compact />
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {t('coach.aiAssistEmpty')}
                  </div>
                )}
              </div>
            )}

            {layout.activeTab === 'later' && (
              <div className="space-y-3 px-3 py-2">
                {summary && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                      <ListChecks className="h-3.5 w-3.5" />
                      {t('coach.topicSummary')}
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                      <MarkdownRenderer>{summary}</MarkdownRenderer>
                    </div>
                  </section>
                )}
                <section className="space-y-2">
                  <div className="text-xs font-medium text-[var(--text-secondary)]">
                    {t('coach.suggestions')}
                  </div>
                  {interviewCoach.suggestions.length > 0 ? (
                    interviewCoach.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={cn(
                          'rounded-[var(--r-control)] border p-3 text-xs leading-relaxed',
                          priorityStyles[suggestion.priority]
                        )}
                      >
                        <div className="mb-1 font-semibold">{suggestion.title}</div>
                        <div className="opacity-90">{suggestion.body}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {t('coach.aiAssistEmpty')}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {!showCoach && hasTranslations && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <section className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <Languages className="h-3.5 w-3.5" />
              {t('coach.liveTranslation')}
            </div>
            <div className="space-y-2">
              {translations.slice(-3).map((item) => (
                <div
                  key={`${item.timestamp}-${item.targetLanguage}`}
                  className="rounded-[var(--r-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-2 text-xs leading-relaxed"
                >
                  <div className="mb-1 text-[10px] uppercase text-[var(--accent)]">
                    {t('coach.translateTo', { lang: item.targetLanguage })}
                  </div>
                  {item.translatedText}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {debrief && <DebriefModal report={debrief} onClose={() => setDebrief(null)} />}
    </div>
  )
}

function DebriefModal({ report, onClose }: { report: DebriefReport; onClose: () => void }) {
  const { t } = useTranslation()
  const minutes = Math.round(report.durationMs / 60000)
  const answerRate =
    report.totalQuestions > 0 ? Math.round((report.answeredCount / report.totalQuestions) * 100) : 0
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-[var(--accent)]" />
            {t('coach.debrief.title')}
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t('coach.debrief.close')}
            aria-label={t('coach.debrief.close')}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <DebriefStat label={t('coach.debrief.duration')} value={`${minutes} min`} />
            <DebriefStat
              label={t('coach.debrief.questions')}
              value={String(report.totalQuestions)}
            />
            <DebriefStat label={t('coach.debrief.answerRate')} value={`${answerRate}%`} />
          </div>

          {report.unansweredQuestions.length > 0 && (
            <DebriefSection title={t('coach.debrief.unanswered')}>
              {report.unansweredQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </DebriefSection>
          )}

          {report.improvements.length > 0 && (
            <DebriefSection title={t('coach.debrief.improvements')}>
              {report.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </DebriefSection>
          )}

          {report.nextPracticePlan.length > 0 && (
            <DebriefSection title={t('coach.debrief.plan')}>
              {report.nextPracticePlan.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </DebriefSection>
          )}

          {report.totalQuestions === 0 && (
            <div className="text-[var(--text-tertiary)]">{t('coach.debrief.empty')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

const PHASE_LABEL_KEY: Record<LiveSessionPhase, string> = {
  idle: 'coach.phase.idle',
  listening: 'coach.phase.listening',
  preparing: 'coach.phase.preparing',
  ready: 'coach.phase.ready',
  'recording-answer': 'coach.phase.recordingAnswer',
  'audio-interrupted': 'coach.phase.audioInterrupted'
}

// Dot color per phase: green when ready, red when audio is interrupted, amber
// while the candidate is answering, accent otherwise.
const PHASE_DOT: Record<LiveSessionPhase, string> = {
  idle: 'bg-[var(--text-tertiary)]',
  listening: 'bg-[var(--accent-fill)]',
  preparing: 'bg-[var(--accent-fill)]',
  ready: 'bg-emerald-500',
  'recording-answer': 'bg-amber-500',
  'audio-interrupted': 'bg-red-500'
}

function LiveStateCapsule({ phase }: { phase: LiveSessionPhase }) {
  const { t } = useTranslation()
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', PHASE_DOT[phase])} />
      {t(PHASE_LABEL_KEY[phase] as Parameters<typeof t>[0])}
    </span>
  )
}

function DebriefStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--hairline)] bg-[var(--surface-2)] p-2 text-center">
      <div className="text-base font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] text-[var(--text-tertiary)]">{label}</div>
    </div>
  )
}

function DebriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--r-sm)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
      <div className="mb-1.5 font-medium text-[var(--text-secondary)]">{title}</div>
      <ul className="list-disc space-y-1 pl-4 text-[var(--text-primary)]">{children}</ul>
    </section>
  )
}
