import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  Code2,
  ImageIcon,
  ScanLine,
  Mic,
  Square,
  ShieldQuestion,
  Loader2,
  X,
  ListTree,
  GitCompare,
  ListChecks,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { useShortcut } from '@/lib/store/shortcuts'
import { useSolutionContent } from '@/lib/store/solution'
import { useChatMessages } from '@/lib/store/chat'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { visibleWindow } from '../../../shared/stream-throttle'
import {
  copyCodeOnlyFromMarkdown,
  hasCodeBlock,
  splitSections,
  type MarkdownSection
} from '../../../shared/answer-markdown'
import {
  CREDIBILITY_ORDER,
  separateByKind,
  type Claim,
  type ProvenanceKind
} from '../../../shared/answer-provenance'
import { classifyQuestion } from '../../../shared/question-type'
import { scaffoldFor } from '../../../shared/question-workbench'
import { blocksFromMarkdown } from '../../../shared/answer-blocks-from-markdown'
import {
  commitRevision,
  createDocument,
  diffRevisions,
  type BlockType
} from '../../../shared/answer-document'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { usePageScrollShortcuts } from './hooks/usePageScrollShortcuts'
import { useSolutionEvents } from './hooks/useSolutionEvents'
import { useAutoScrollFollow } from './hooks/useAutoScrollFollow'
import { useCopyLatestAnswer } from './hooks/useCopyLatestAnswer'
import { isScreenPermissionError } from './hooks/screen-permission'
import { isTranscriptionError } from './hooks/transcription-error'
import { useTranscriptionToggle } from './hooks/useTranscriptionToggle'
import { ChatComposer } from './ChatComposer'
import { useModalDismiss } from './hooks/useModalDismiss'

export function AppContent({ zeroUiMode = false }: { zeroUiMode?: boolean }) {
  const { t } = useTranslation()
  const { errorMessage, setErrorMessage } = useSolutionContent()
  const [, setRecentScreenshots] = useState<string[]>([])
  const messages = useChatMessages()
  // Cap rendered DOM rows to the most recent 60 (P0#16): older messages stay in
  // the store/history but leave the DOM so long sessions don't degrade.
  const renderedMessages = visibleWindow(messages, 60)
  const toggleTranscription = useTranscriptionToggle()

  useSolutionEvents({ setRecentScreenshots })
  usePageScrollShortcuts()
  useCopyLatestAnswer()
  useAutoScrollFollow(messages.map((m) => m.text).join('').length + messages.length)

  const hasMessages = messages.length > 0
  const isStreaming = messages.some((m) => m.role === 'assistant' && m.streaming)

  // Provenance ("可信度分析") modal state: which answer is being analyzed, the
  // resulting claims, and whether the AI call is in flight.
  const [provenanceClaims, setProvenanceClaims] = useState<Claim[] | null>(null)
  const [provenanceLoading, setProvenanceLoading] = useState(false)
  const analyzeProvenance = async (text: string) => {
    setProvenanceLoading(true)
    setProvenanceClaims([])
    try {
      const claims = await window.api.tagAnswerProvenance(text)
      setProvenanceClaims(claims)
    } finally {
      setProvenanceLoading(false)
    }
  }
  // Block-level ("分块复制") view of an answer, parsed from its markdown headings.
  const [sections, setSections] = useState<MarkdownSection[] | null>(null)
  // Revision-diff ("对比上一版") state: the two answer texts being compared.
  const [diffPair, setDiffPair] = useState<{ prev: string; curr: string } | null>(null)

  // Text of the assistant answer immediately preceding each assistant message,
  // so an answer can be diffed against the prior one (block-level revision diff).
  const prevAssistantText = new Map<string, string>()
  let lastAssistant: string | null = null
  for (const m of messages) {
    if (m.role === 'assistant' && m.text) {
      if (lastAssistant !== null) prevAssistantText.set(m.id, lastAssistant)
      lastAssistant = m.text
    }
  }

  if (zeroUiMode) {
    const outputs = renderedMessages.filter(
      (message) => message.role === 'assistant' && (message.text || message.error)
    )
    return (
      <main
        id="app-content"
        className="zero-ui-shell min-w-0 flex-1"
        role="log"
        aria-label={t('workbench.solutionOutput')}
      >
        {outputs.map((message) => (
          <pre
            key={message.id}
            className={message.error ? 'zero-ui-output is-error' : 'zero-ui-output'}
            aria-live={message.streaming ? 'polite' : undefined}
            aria-busy={message.streaming || undefined}
          >
            <code>{message.text}</code>
          </pre>
        ))}
        {errorMessage && outputs.length === 0 && (
          <pre className="zero-ui-output is-error">
            <code>{errorMessage}</code>
          </pre>
        )}
      </main>
    )
  }

  return (
    <main id="app-content" className="workbench-shell flex min-w-0 flex-1 flex-col !h-full">
      {errorMessage && (
        <div className="workbench-error">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t('workbench.errorTitle')}</p>
            <p className="text-sm mt-1 break-words opacity-80">{errorMessage}</p>
            <p className="workbench-error-hint">{t('workbench.errorHint')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {isScreenPermissionError(errorMessage) && (
                <button
                  className="workbench-retry-btn"
                  onClick={() => window.api.openScreenRecordingSettings()}
                >
                  {t('workbench.openScreenSettings')}
                </button>
              )}
              {isTranscriptionError(t, errorMessage) ? (
                <button
                  className="workbench-retry-btn"
                  onClick={() => {
                    setErrorMessage(null)
                    toggleTranscription()
                  }}
                >
                  {t('transcription.restart')}
                </button>
              ) : (
                <button
                  className="workbench-retry-btn"
                  onClick={() => {
                    setErrorMessage(null)
                    window.api.retryLastSolution()
                  }}
                >
                  {t('workbench.retry')}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="workbench-error-close"
            title={t('header.close')}
            aria-label={t('header.close')}
          >
            ×
          </button>
        </div>
      )}

      {hasMessages ? (
        <div className="chat-flow" role="log" aria-label={t('workbench.solutionOutput')}>
          {renderedMessages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="chat-msg-user">
                {m.image ? (
                  <div className="chat-shot">
                    <span className="chat-shot-tag">
                      <ImageIcon className="h-3 w-3" />
                    </span>
                    <img src={`data:image/png;base64,${m.image}`} alt="screenshot" />
                  </div>
                ) : m.hasImage ? (
                  <div className="chat-shot-placeholder">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>{t('workbench.screenshotArchived')}</span>
                  </div>
                ) : (
                  <div className="chat-bubble-user">
                    <QuestionScaffold text={m.text} />
                    {m.text}
                  </div>
                )}
              </div>
            ) : (
              <div key={m.id} className="chat-msg-assistant">
                <div
                  className={m.error ? 'chat-bubble-assistant is-error' : 'chat-bubble-assistant'}
                  aria-live={m.streaming ? 'polite' : undefined}
                  aria-busy={m.streaming || undefined}
                >
                  {m.text ? (
                    <>
                      <MarkdownRenderer>{m.text}</MarkdownRenderer>
                      {!m.streaming && (
                        <div className="chat-copy-actions">
                          <button
                            className="chat-copy-btn"
                            title={t('provenance.analyze')}
                            aria-label={t('provenance.analyze')}
                            onClick={() => analyzeProvenance(m.text)}
                          >
                            <ShieldQuestion className="h-3.5 w-3.5" />
                          </button>
                          {splitSections(m.text).length > 1 && (
                            <button
                              className="chat-copy-btn"
                              title={t('blocks.open')}
                              aria-label={t('blocks.open')}
                              onClick={() => setSections(splitSections(m.text))}
                            >
                              <ListTree className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {prevAssistantText.has(m.id) && (
                            <button
                              className="chat-copy-btn"
                              title={t('revisionDiff.open')}
                              aria-label={t('revisionDiff.open')}
                              onClick={() =>
                                setDiffPair({
                                  prev: prevAssistantText.get(m.id) ?? '',
                                  curr: m.text
                                })
                              }
                            >
                              <GitCompare className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {hasCodeBlock(m.text) && (
                            <button
                              className="chat-copy-btn"
                              title={t('workbench.copyCodeOnly')}
                              aria-label={t('workbench.copyCodeOnly')}
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    copyCodeOnlyFromMarkdown(m.text)
                                  )
                                  toast.success(t('workbench.copiedCode'))
                                } catch {
                                  // Clipboard rejected; don't claim success.
                                }
                              }}
                            >
                              <Code2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            className="chat-copy-btn"
                            title={t('workbench.copy')}
                            aria-label={t('workbench.copy')}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(m.text)
                                toast.success(t('workbench.copied'))
                              } catch {
                                // Clipboard rejected; don't claim success.
                              }
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="chat-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <EmptyState />
      )}
      <ChatComposer disabled={isStreaming} hasConversation={hasMessages} />
      {provenanceClaims !== null && (
        <ProvenanceModal
          claims={provenanceClaims}
          loading={provenanceLoading}
          onClose={() => setProvenanceClaims(null)}
        />
      )}
      {sections !== null && <SectionsModal sections={sections} onClose={() => setSections(null)} />}
      {diffPair !== null && (
        <RevisionDiffModal
          prev={diffPair.prev}
          curr={diffPair.curr}
          onClose={() => setDiffPair(null)}
        />
      )}
    </main>
  )
}

// A collapsible answer-framework checklist under a typed user question (P1#27 /
// P2#43). The question type is classified locally and its scaffold steps come
// from the pure question-workbench module; purely a guide, nothing is sent.
function QuestionScaffold({ text }: { text: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const type = classifyQuestion(text)
  if (type === 'unknown') return null
  const steps = scaffoldFor(type)
  return (
    <div className="chat-scaffold">
      <button
        type="button"
        className="chat-scaffold-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="chat-qtype-badge">{t(`questionType.${type}`)}</span>
        {steps.length > 0 && (
          <span className="chat-scaffold-hint">
            <ListChecks className="h-3 w-3" />
            {t('scaffold.title')}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        )}
      </button>
      {open && steps.length > 0 && (
        <ol className="chat-scaffold-steps">
          {steps.map((step) => (
            <li key={step.id}>
              <span>{t(`scaffold.${step.id}` as Parameters<typeof t>[0])}</span>
              {step.optional && (
                <span className="chat-scaffold-optional">{t('scaffold.optional')}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// Diff status per block type between two answer revisions, derived from the pure
// diffRevisions() over blocks parsed from each answer's markdown.
type DiffStatus = 'unchanged' | 'changed' | 'added' | 'removed'

const DIFF_TONE: Record<DiffStatus, string> = {
  unchanged: 'bg-[var(--text-tertiary)]',
  changed: 'bg-amber-500',
  added: 'bg-emerald-500',
  removed: 'bg-red-500'
}

function RevisionDiffModal({
  prev,
  curr,
  onClose
}: {
  prev: string
  curr: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  // Two revisions of the same answer document, so the tested diffRevisions()
  // reports which typed blocks were added / removed / changed / unchanged.
  const doc = commitRevision(
    commitRevision(createDocument(), blocksFromMarkdown(prev), 1),
    blocksFromMarkdown(curr),
    2
  )
  const [a, b] = doc.revisions
  const has = (type: BlockType, rev: typeof a): boolean =>
    rev.blocks.some((block) => block.type === type)
  const rows = diffRevisions(a, b).map(({ type, changed }) => {
    let status: DiffStatus
    if (!has(type, a)) status = 'added'
    else if (!has(type, b)) status = 'removed'
    else status = changed ? 'changed' : 'unchanged'
    return { type, status }
  })
  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('revisionDiff.title')}
        className="m-auto flex max-h-[80vh] w-[460px] flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-sm font-semibold">{t('revisionDiff.title')}</h1>
          </div>
          <button
            onClick={onClose}
            aria-label={t('header.close')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-5 text-xs">
          {rows.length === 0 ? (
            <div className="text-[var(--text-tertiary)]">{t('revisionDiff.empty')}</div>
          ) : (
            rows.map(({ type, status }) => (
              <div
                key={type}
                className="flex items-center justify-between gap-2 rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-2"
              >
                <span className="font-semibold text-[var(--text-secondary)]">
                  {t(`blockType.${type}` as Parameters<typeof t>[0])}
                </span>
                <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                  <span className={`h-1.5 w-1.5 rounded-full ${DIFF_TONE[status]}`} />
                  {t(`revisionDiff.${status}` as Parameters<typeof t>[0])}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SectionsModal({
  sections,
  onClose
}: {
  sections: MarkdownSection[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  const copy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t('workbench.copied'))
    } catch {
      // Clipboard rejected; skip success toast.
    }
  }
  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('blocks.title')}
        className="m-auto flex max-h-[80vh] w-[460px] flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-sm font-semibold">{t('blocks.title')}</h1>
          </div>
          <button
            onClick={onClose}
            aria-label={t('header.close')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5 text-xs">
          {sections.map((section, i) => (
            <section
              key={i}
              className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-secondary)]">
                  {section.heading || t('blocks.preamble')}
                </span>
                <button
                  onClick={() => copy(section.content || section.heading)}
                  title={t('workbench.copy')}
                  aria-label={t('workbench.copy')}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {section.content && (
                <div className="whitespace-pre-wrap leading-relaxed text-[var(--text-primary)]">
                  {section.content.length > 240
                    ? `${section.content.slice(0, 240)}…`
                    : section.content}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

const PROVENANCE_TONE: Record<ProvenanceKind, string> = {
  'problem-text': 'bg-emerald-500',
  'user-constraint': 'bg-emerald-500',
  'known-fact': 'bg-sky-500',
  assumption: 'bg-amber-500',
  'ai-inference': 'bg-amber-500',
  unconfirmed: 'bg-red-500'
}

function ProvenanceModal({
  claims,
  loading,
  onClose
}: {
  claims: Claim[]
  loading: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  const buckets = separateByKind(claims)
  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('provenance.title')}
        className="m-auto flex max-h-[80vh] w-[460px] flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-sm font-semibold">{t('provenance.title')}</h1>
          </div>
          <button
            onClick={onClose}
            aria-label={t('header.close')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 text-xs">
          {loading ? (
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('provenance.analyzing')}
            </div>
          ) : claims.length === 0 ? (
            <div className="text-[var(--text-tertiary)]">{t('provenance.empty')}</div>
          ) : (
            CREDIBILITY_ORDER.filter((kind) => buckets[kind].length > 0).map((kind) => (
              <section
                key={kind}
                className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-[var(--text-secondary)]">
                  <span className={`h-1.5 w-1.5 rounded-full ${PROVENANCE_TONE[kind]}`} />
                  {t(`provenance.kind.${kind}` as Parameters<typeof t>[0])}
                </div>
                <ul className="space-y-1">
                  {buckets[kind].map((claim) => (
                    <li
                      key={claim.id}
                      className="flex items-start gap-1.5 text-[var(--text-primary)]"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
                      <span className="leading-relaxed">{claim.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  const takeScreenshotShortcut = useShortcut('takeScreenshot')
  const toggleTranscriptionShortcut = useShortcut('toggleTranscription')
  const isTranscribing = useTranscriptionStore((state) => state.isTranscribing)
  const hasInterviewSession = useTranscriptionStore(
    (state) =>
      state.isTranscribing ||
      Boolean(state.transcriptionText) ||
      state.detectedQuestion !== null ||
      state.assists.length > 0
  )
  const toggleTranscription = useTranscriptionToggle()

  if (hasInterviewSession) {
    return (
      <div className="chat-empty interview-session-stage">
        <div className="interview-session-copy">
          <div className="interview-session-kicker">
            <span className={isTranscribing ? 'is-live' : ''} aria-hidden="true" />
            {isTranscribing ? t('coach.recording') : t('coach.phase.ready')}
          </div>
          <h1>{t('coach.title')}</h1>
          <p>{t('coach.subtitle')}</p>
          <div className="interview-session-shortcut">
            <span>{isTranscribing ? t('transcription.stopBtn') : t('transcription.startBtn')}</span>
            <ShortcutRenderer
              shortcut={toggleTranscriptionShortcut?.key ?? ''}
              className="workbench-shortcut-key"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-empty home-stage">
      <div className="home-intro">
        <div className="home-brandline">
          <span className="home-brand-mark" aria-hidden="true" />
          <span>{t('header.appName')}</span>
        </div>
        <h1>{t('workbench.startTitle')}</h1>
        <p>{t('workbench.startDesc')}</p>
      </div>

      <div className="home-actions">
        <article className="home-action home-action-primary">
          <div className="home-action-topline">
            <span className="home-action-icon">
              <ScanLine className="h-[18px] w-[18px]" />
            </span>
            <span className="home-action-index" aria-hidden="true">
              01
            </span>
          </div>
          <div className="home-action-copy">
            <h2>{t('workbench.emptyAnswerTitle')}</h2>
            <p>{t('workbench.emptyAnswerDesc')}</p>
          </div>
          <div className="home-action-footer">
            <span>{t('workbench.startScreenshotHint')}</span>
            <ShortcutRenderer
              shortcut={takeScreenshotShortcut?.key ?? ''}
              className="workbench-shortcut-key"
            />
          </div>
        </article>

        <button
          type="button"
          onClick={() => void toggleTranscription()}
          className={`home-action home-action-button ${isTranscribing ? 'is-live' : ''}`}
          aria-label={isTranscribing ? t('transcription.stopBtn') : t('transcription.startBtn')}
        >
          <div className="home-action-topline">
            <span className="home-action-icon">
              {isTranscribing ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-[18px] w-[18px]" />
              )}
            </span>
            <span className="home-action-index" aria-hidden="true">
              02
            </span>
          </div>
          <div className="home-action-copy">
            <h2>{t('coach.title')}</h2>
            <p>{t('coach.subtitle')}</p>
          </div>
          <div className="home-action-footer">
            <span>{isTranscribing ? t('transcription.stopBtn') : t('transcription.startBtn')}</span>
            <ShortcutRenderer
              shortcut={toggleTranscriptionShortcut?.key ?? ''}
              className="workbench-shortcut-key"
            />
          </div>
        </button>
      </div>
    </div>
  )
}
