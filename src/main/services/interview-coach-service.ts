import {
  streamInterviewAssist,
  streamProactiveAssist,
  summarizeConversation,
  translateTranscriptText,
  distillMemoryCandidates
} from '../ai'
import { settings } from '../settings'
import { recordEgress } from '../outbound-log'
import { recordCost } from '../session-cost'
import { createEmptyProfile } from '../../shared/memory-profile'
import { withFirstChunkTimeout } from '../../shared/stream-timeout'
import {
  analyzeTranscriptTurn,
  createInitialInterviewCoachState,
  looksLikeQuestion,
  type InterviewCoachState,
  type InterviewLanguage,
  type SpeakerRole
} from '../../shared/interview-coach'
import {
  createMachine,
  detectQuestion,
  currentQuestion,
  type QuestionMachine
} from '../../shared/question-machine'
import { shouldTranslateText } from '../../shared/translation-gate'
import { shouldRunProactiveAssist } from '../../shared/proactive-assist'
import { shouldDistillMemory } from '../../shared/memory-distill-gate'
import { buildTranscriptContext } from '../../shared/transcript-context'
import {
  buildDebrief,
  debriefTurnsFromTranscript,
  type DebriefReport
} from '../../shared/debrief-report'
import {
  compileContext,
  summarizeManifestForUser,
  type ContextItem
} from '../../shared/context-manifest'

export type RendererSender = (channel: string, ...args: unknown[]) => void

export interface TranscriptionSentenceEvent {
  text: string
  isPartial: boolean
  providerSpeaker?: SpeakerRole
}

const DEFAULT_ASSIST_DEBOUNCE_MS = 1500
const MIN_ASSIST_DEBOUNCE_MS = 200
const MAX_ASSIST_DEBOUNCE_MS = 10000
const SUMMARY_INTERVAL_TURNS = 6
// Distill memory candidates less often than summaries — it's an extra model
// call and the user must confirm each result, so we don't want it firing every
// few turns.
const DISTILL_INTERVAL_TURNS = 10
// Proactive "vibe" assist: fire at most this often, and only when new
// conversation has accrued since the last proactive run.
const PROACTIVE_INTERVAL_MS = 20000
// A stalled assist stream would keep assistInFlight=true and block every later
// assist. Bound time-to-first-token so a hung provider self-recovers.
const ASSIST_FIRST_CHUNK_TIMEOUT_MS = 15000

/** Resolve the user-configured assist debounce, falling back to the default
   when the stored value is missing or out of the sane range. */
function resolveAssistDebounceMs(): number {
  const value = settings.assistDebounceMs
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < MIN_ASSIST_DEBOUNCE_MS ||
    value > MAX_ASSIST_DEBOUNCE_MS
  ) {
    return DEFAULT_ASSIST_DEBOUNCE_MS
  }
  return value
}

export class InterviewCoachService {
  private coachState: InterviewCoachState = createInitialInterviewCoachState()
  private assistTimer: NodeJS.Timeout | null = null
  private assistAbort: AbortController | null = null
  // Monotonic id for the latest assist request. Any emission whose id is not the
  // current one is stale (a superseded question) and must be dropped, so a late
  // chunk can never overwrite the answer for a newer question. Runtime embodiment
  // of question-machine's isStaleResponse guard.
  private assistRequestSeq = 0
  private pendingQuestion = ''
  // Structured current-question tracker (question-machine). Runs alongside the
  // debounced-assist flow: interviewer turns are detected as questions so the
  // current/queued question state is queryable and can tag requests later.
  private questionMachine: QuestionMachine = createMachine()
  private recentTurns: { speaker: SpeakerRole; text: string }[] = []
  private finalizedTurnCount = 0
  private lastSummaryAtTurn = 0
  private lastDistillAtTurn = 0
  // Proactive assist: periodic timer + bookkeeping so we only run when there's
  // genuinely new conversation and never overlap with an in-flight assist.
  private proactiveTimer: NodeJS.Timeout | null = null
  private proactiveAbort: AbortController | null = null
  private turnCountAtLastProactive = 0
  private assistInFlight = false
  // Live-capsule signals (P0#20): whether finalized answer points exist for the
  // current question (cleared when a new question/assist supersedes them), and
  // whether the candidate spoke most recently. Drive deriveLivePhase's
  // 'ready' / 'recording-answer' phases, which were previously hardcoded false.
  private hasReadyAnswer = false
  private candidateSpeaking = false
  // Abort for an in-flight distillation so a late 'memory-candidates' push
  // can't pop the confirm bar after the user already stopped the session.
  private distillAbort: AbortController | null = null
  // In-flight translation requests, tracked so they can be cancelled when the
  // session stops (several may overlap as sentences finalize quickly).
  private translationAborts = new Set<AbortController>()
  // Warn once when translation is enabled but its dependency (an AI key) is
  // missing, so the feature is never silently on-but-non-functional (P0#15).
  private translationDepWarned = false

  constructor(private readonly sendToRenderer: RendererSender) {}

  reset() {
    this.coachState = createInitialInterviewCoachState()
    this.sendToRenderer('interview-coach-updated', this.coachState)
    if (this.assistTimer) {
      clearTimeout(this.assistTimer)
      this.assistTimer = null
    }
    this.assistAbort?.abort()
    this.assistAbort = null
    this.pendingQuestion = ''
    this.recentTurns = []
    this.finalizedTurnCount = 0
    this.lastSummaryAtTurn = 0
    this.lastDistillAtTurn = 0
    this.stopProactive()
    this.turnCountAtLastProactive = 0
    this.assistInFlight = false
    this.hasReadyAnswer = false
    this.candidateSpeaking = false
    this.distillAbort?.abort()
    this.distillAbort = null
    for (const abort of this.translationAborts) abort.abort()
    this.translationAborts.clear()
  }

  /** Begin/stop the proactive "vibe" loop. Called from transcription start/stop
     so the timer only runs while a session is active. */
  startProactive() {
    if (this.proactiveTimer) return
    this.proactiveTimer = setInterval(() => void this.runProactiveTick(), PROACTIVE_INTERVAL_MS)
  }

  stopProactive() {
    if (this.proactiveTimer) {
      clearInterval(this.proactiveTimer)
      this.proactiveTimer = null
    }
    this.proactiveAbort?.abort()
    this.proactiveAbort = null
  }

  /** Cancel all in-flight/pending AI work (debounced assist, streaming assist,
     proactive loop) without clearing the accumulated coach state. Called when
     transcription stops so a late assist/stream can't pop up after the user
     ended the session, while the transcript and assists remain viewable and
     exportable. */
  stopInFlightWork() {
    if (this.assistTimer) {
      clearTimeout(this.assistTimer)
      this.assistTimer = null
    }
    this.assistAbort?.abort()
    this.assistAbort = null
    this.pendingQuestion = ''
    this.stopProactive()
    this.assistInFlight = false
    this.distillAbort?.abort()
    this.distillAbort = null
    // Cancel any translations still in flight so a late result can't arrive
    // after the session ended.
    for (const abort of this.translationAborts) abort.abort()
    this.translationAborts.clear()
  }

  handleSentence(event: TranscriptionSentenceEvent) {
    const text = event.text.trim()
    if (!text) return

    this.updateCoach(event)

    if (!event.isPartial) {
      void this.translateFinalSentence(text)
      this.trackFinalizedTurn(event)
    }
  }

  private updateCoach(event: TranscriptionSentenceEvent) {
    if (!settings.interviewCoachEnabled || !event.text.trim()) return
    const providerSpeaker = event.providerSpeaker

    this.coachState = analyzeTranscriptTurn(this.coachState, {
      text: event.text,
      isPartial: event.isPartial,
      language: settings.transcriptionLanguage as InterviewLanguage,
      providerSpeaker
    })
    this.candidateSpeaking = this.coachState.currentSpeaker === 'candidate'
    this.sendToRenderer('interview-coach-updated', this.coachState)
  }

  /** Track finalized turns for assist/summary; debounce assist on interviewer
     questions and periodically refresh the topic summary. */
  private trackFinalizedTurn(event: TranscriptionSentenceEvent) {
    const text = event.text.trim()
    const speaker = this.coachState.currentSpeaker
    this.recentTurns.push({ speaker, text })
    this.recentTurns = this.recentTurns.slice(-12)
    this.finalizedTurnCount += 1

    if (!settings.realtimeAssistEnabled) return

    // The interviewer is talking — accumulate their words, and (re)arm a
    // debounced assist only when what they've said looks like an actual
    // question, so filler/transition lines don't waste tokens.
    if (speaker === 'interviewer') {
      this.pendingQuestion = this.pendingQuestion ? `${this.pendingQuestion} ${text}` : text
      this.questionMachine = detectQuestion(this.questionMachine, { text, now: Date.now() })
      if (this.assistTimer) clearTimeout(this.assistTimer)
      if (looksLikeQuestion(this.pendingQuestion)) {
        this.assistTimer = setTimeout(() => void this.runAssist(), resolveAssistDebounceMs())
      }
    }

    if (this.finalizedTurnCount - this.lastSummaryAtTurn >= SUMMARY_INTERVAL_TURNS) {
      this.lastSummaryAtTurn = this.finalizedTurnCount
      void this.runSummary()
    }

    // Periodically distill durable facts the candidate stated, for opt-in,
    // confirm-gated saving into their memory profile. Gated (feature flag, API
    // key, interval, content) via the tested pure helper.
    if (
      shouldDistillMemory({
        enabled: settings.memoryDistillEnabled,
        hasApiKey: Boolean(settings.apiKey),
        finalizedTurnCount: this.finalizedTurnCount,
        lastDistillAtTurn: this.lastDistillAtTurn,
        intervalTurns: DISTILL_INTERVAL_TURNS,
        recentTurnCount: this.recentTurns.length
      })
    ) {
      this.lastDistillAtTurn = this.finalizedTurnCount
      void this.runDistill()
    }
  }

  /** Manually trigger an assist from whatever the interviewer last said. */
  requestAssistNow() {
    const question =
      this.pendingQuestion ||
      [...this.recentTurns].reverse().find((turn) => turn.speaker === 'interviewer')?.text ||
      this.recentTurns[this.recentTurns.length - 1]?.text ||
      ''
    if (this.assistTimer) {
      clearTimeout(this.assistTimer)
      this.assistTimer = null
    }
    this.pendingQuestion = question
    void this.runAssist()
  }

  /** Whether an assist stream is currently in flight (for the live capsule). */
  isAssistInFlight(): boolean {
    return this.assistInFlight
  }

  /** Whether finalized answer points are ready for the current question. */
  hasReadyAnswerNow(): boolean {
    return this.hasReadyAnswer
  }

  /** Whether the candidate (microphone) spoke most recently. */
  isCandidateSpeaking(): boolean {
    return this.candidateSpeaking
  }

  /** The number of finalized turns in the current coach timeline (for the soak
     sampler's stalled-transcription signal). */
  turnCount(): number {
    return this.coachState.turns.length
  }

  /** The structured current-question text from the question machine, or ''. */
  currentDetectedQuestion(): string {
    return currentQuestion(this.questionMachine)?.text ?? ''
  }

  /** Build a post-interview debrief (复盘) report from the accumulated coach
     timeline. Session timing is supplied by the transcription layer, which owns
     the live session clock. Pure derivation — no AI call. */
  buildDebriefReport(sessionStart: number, sessionEnd: number): DebriefReport {
    const debriefTurns = debriefTurnsFromTranscript(
      this.coachState.turns.map((turn) => ({
        id: turn.id,
        speaker: turn.speaker,
        text: turn.text,
        timestamp: turn.timestamp
      }))
    )
    return buildDebrief({ turns: debriefTurns, sessionStart, sessionEnd })
  }

  private buildContext(): string {
    return buildTranscriptContext(this.recentTurns)
  }

  /** Build a human-readable summary of what the AI "remembers this request"
     (P0#7): the recent turns compiled into a ContextManifest. Recent turns
     become fact-kind context items; the pending question is the current one. */
  buildContextManifest(): string {
    const items: ContextItem[] = this.recentTurns.map((turn, i) => ({
      turnId: `t${i}`,
      text: turn.text,
      kind: 'fact',
      estimatedTokens: 0
    }))
    const manifest = compileContext({
      currentQuestion: this.pendingQuestion,
      items,
      constraints: [],
      summary: '',
      screenshots: [],
      profileFields: [],
      budget: { modelContextWindow: 128000 }
    })
    return summarizeManifestForUser(manifest)
  }

  private async runAssist() {
    const question = this.pendingQuestion
    this.pendingQuestion = ''
    this.assistTimer = null
    if (!question.trim()) return

    // Abort any in-flight assist so a newer question supersedes it.
    this.assistAbort?.abort()
    const abort = new AbortController()
    this.assistAbort = abort
    this.assistInFlight = true
    // A new question supersedes any previously-ready answer.
    this.hasReadyAnswer = false
    const requestId = ++this.assistRequestSeq
    // Only the latest request may emit — drops late chunks from a superseded run.
    const isCurrent = () => requestId === this.assistRequestSeq && !abort.signal.aborted

    const startedAt = Date.now()
    let assistOk = true
    this.sendToRenderer('interview-assist-loading', { question, timestamp: startedAt })
    try {
      let points = ''
      const stream = withFirstChunkTimeout(
        streamInterviewAssist(question, this.buildContext(), abort.signal),
        ASSIST_FIRST_CHUNK_TIMEOUT_MS,
        abort
      )
      for await (const chunk of stream) {
        if (!isCurrent()) return
        points += chunk
        this.sendToRenderer('interview-assist-chunk', { question, points, timestamp: startedAt })
      }
      if (!isCurrent()) return
      if (points.trim()) {
        this.hasReadyAnswer = true
        this.sendToRenderer('interview-assist', {
          question,
          points: points.trim(),
          timestamp: startedAt
        })
      } else {
        this.sendToRenderer('interview-assist-error')
        assistOk = false
      }
    } catch (error) {
      if (!isCurrent()) return
      console.error('Failed to generate interview assist:', error)
      this.sendToRenderer('interview-assist-error')
      assistOk = false
    } finally {
      if (requestId === this.assistRequestSeq) this.assistInFlight = false
      recordEgress({
        categories: settings.userMemory?.trim()
          ? ['transcript', 'prompt', 'profile']
          : ['transcript', 'prompt'],
        reason: 'interview-assist',
        approxBytes: question.length + this.buildContext().length,
        outcome: assistOk ? 'success' : 'failure',
        at: Date.now()
      })
      recordCost('assist', (question.length + this.buildContext().length) / 4, Date.now())
    }
  }

  /** Proactive tick: when enabled and new conversation has accrued, stream a
     "what to say now" assist based on the recent vibe. Skips when an assist is
     already in flight (question-triggered) or there's nothing new to react to. */
  private async runProactiveTick() {
    if (
      !shouldRunProactiveAssist({
        enabled: settings.proactiveAssistEnabled,
        hasApiKey: Boolean(settings.apiKey),
        assistInFlight: this.assistInFlight,
        finalizedTurnCount: this.finalizedTurnCount,
        turnCountAtLastProactive: this.turnCountAtLastProactive,
        recentTurnCount: this.recentTurns.length
      })
    ) {
      return
    }
    this.turnCountAtLastProactive = this.finalizedTurnCount

    this.assistAbort?.abort()
    const abort = new AbortController()
    this.assistAbort = abort
    this.proactiveAbort = abort
    this.assistInFlight = true
    const requestId = ++this.assistRequestSeq
    const isCurrent = () => requestId === this.assistRequestSeq && !abort.signal.aborted

    const startedAt = Date.now()
    const label = '（实时跟进）'
    this.sendToRenderer('interview-assist-loading', { question: label, timestamp: startedAt })
    try {
      let points = ''
      const stream = withFirstChunkTimeout(
        streamProactiveAssist(this.buildContext(), abort.signal),
        ASSIST_FIRST_CHUNK_TIMEOUT_MS,
        abort
      )
      for await (const chunk of stream) {
        if (!isCurrent()) return
        points += chunk
        this.sendToRenderer('interview-assist-chunk', {
          question: label,
          points,
          timestamp: startedAt
        })
      }
      if (!isCurrent()) return
      if (points.trim()) {
        this.sendToRenderer('interview-assist', {
          question: label,
          points: points.trim(),
          timestamp: startedAt
        })
      } else {
        this.sendToRenderer('interview-assist-error')
      }
    } catch (error) {
      if (!isCurrent()) return
      console.error('Failed to generate proactive assist:', error)
      this.sendToRenderer('interview-assist-error')
    } finally {
      if (requestId === this.assistRequestSeq) this.assistInFlight = false
    }
  }

  private async runSummary() {
    try {
      const summary = await summarizeConversation(this.buildContext())
      if (summary) {
        this.sendToRenderer('interview-summary', { summary, timestamp: Date.now() })
      }
    } catch (error) {
      console.error('Failed to summarize conversation:', error)
    }
  }

  /** Distill durable candidate facts from the recent conversation and push them
     to the renderer for explicit user confirmation — nothing is saved here. The
     active profile's known facts (mirrored into settings.userMemory) seed the
     dedup context so already-saved facts aren't re-proposed. */
  private async runDistill() {
    this.distillAbort?.abort()
    const abort = new AbortController()
    this.distillAbort = abort
    try {
      const profile = createEmptyProfile('active', 'active')
      profile.freeform = settings.userMemory?.trim() ?? ''
      const candidates = await distillMemoryCandidates(this.buildContext(), profile)
      // Drop a late result if the session was stopped while the model ran.
      if (abort.signal.aborted) return
      if (candidates.length > 0) {
        this.sendToRenderer('memory-candidates', { candidates, timestamp: Date.now() })
      }
    } catch (error) {
      console.error('Failed to distill memory candidates:', error)
    }
  }

  private async translateFinalSentence(text: string) {
    if (!settings.translationEnabled || !text.trim()) return
    // Translation depends on an AI key. If it's enabled without one, warn the
    // user once instead of silently doing nothing (P0#15 config dependency).
    if (!settings.apiKey) {
      if (!this.translationDepWarned) {
        this.translationDepWarned = true
        this.sendToRenderer('transcription-translation-error', '实时翻译需要先在设置中配置 AI Key')
      }
      return
    }
    this.translationDepWarned = false
    // Skip when the line is already in the target language (e.g. zh→zh): that
    // would waste a model call and add a useless same-language line to the UI.
    if (!shouldTranslateText(text, settings.translationTargetLanguage)) return

    const abort = new AbortController()
    this.translationAborts.add(abort)
    try {
      const translatedText = await translateTranscriptText(
        text,
        settings.translationTargetLanguage,
        abort.signal
      )
      if (abort.signal.aborted) return
      if (translatedText) {
        this.sendToRenderer('transcription-translation', {
          sourceText: text,
          translatedText,
          targetLanguage: settings.translationTargetLanguage,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      // A cancelled request (session stopped) is expected — don't surface it.
      if (abort.signal.aborted) return
      console.error('Failed to translate transcript:', error)
      this.sendToRenderer('transcription-translation-error', '实时翻译失败，请检查 AI 设置')
    } finally {
      this.translationAborts.delete(abort)
    }
  }
}
