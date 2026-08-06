// Post-interview debrief ("复盘中心") report builder. Pure logic only: it
// derives the entire report structure from session data with no AI calls, no
// IO, and no clock/random access — so it stays deterministic and testable.

export interface DebriefTurn {
  turnId: string
  question: string
  /** Did this turn reach a final answer? */
  answered: boolean
  /** How many revisions the answer went through. */
  answerRevisions: number
  interrupted: boolean
  constraintsRespected: boolean
  startedAt: number
  endedAt: number | null
}

export interface DebriefInput {
  turns: DebriefTurn[]
  sessionStart: number
  sessionEnd: number
}

export interface DebriefTimelineEntry {
  turnId: string
  question: string
  /** endedAt - startedAt, or null when the turn never ended. */
  durationMs: number | null
}

export interface DebriefReport {
  durationMs: number
  totalQuestions: number
  answeredCount: number
  /** Questions of turns where answered === false. */
  unansweredQuestions: string[]
  /** turnIds of interrupted turns. */
  interruptedTurns: string[]
  /** turnIds of turns where constraintsRespected === false. */
  constraintViolations: string[]
  averageRevisions: number
  timeline: DebriefTimelineEntry[]
  /** Derived, rule-based improvement suggestions (de-duplicated, ordered). */
  improvements: string[]
  /** Derived, rule-based next-practice focus areas. */
  nextPracticePlan: string[]
}

// Average revisions is considered "high" above this threshold.
const HIGH_REVISION_THRESHOLD = 2

// Suggestion strings kept as constants so the improvements and the derived
// practice plan reference the same wording without drifting.
const IMPROVEMENT_UNANSWERED = '练习把题目答完整'
const IMPROVEMENT_CONSTRAINTS = '注意遵守题目约束/边界'
const IMPROVEMENT_REVISIONS = '先想清楚再作答，减少反复'
const IMPROVEMENT_INTERRUPTED = '练习被打断后快速回到主线'

const PLAN_UNANSWERED = '安排限时答题训练，确保每题给出完整解答'
const PLAN_CONSTRAINTS = '刷带明确约束/边界条件的题目，作答前先复述约束'
const PLAN_REVISIONS = '作答前先在草稿上梳理思路，减少中途返工'
const PLAN_INTERRUPTED = '模拟被追问/打断的场景，训练快速回到主线'
const PLAN_CLEAN = '保持当前节奏，尝试更高难度的题目'

/** Questions of turns that never reached a final answer. */
export function unansweredQuestions(turns: DebriefTurn[]): string[] {
  return turns.filter((turn) => !turn.answered).map((turn) => turn.question)
}

/** turnIds of turns where the constraints were not respected. */
export function constraintViolations(turns: DebriefTurn[]): string[] {
  return turns.filter((turn) => !turn.constraintsRespected).map((turn) => turn.turnId)
}

/** Mean of answerRevisions across turns; 0 when there are no turns. */
export function averageRevisions(turns: DebriefTurn[]): number {
  if (turns.length === 0) return 0
  const total = turns.reduce((sum, turn) => sum + turn.answerRevisions, 0)
  return total / turns.length
}

/** turnIds of interrupted turns. */
function interruptedTurns(turns: DebriefTurn[]): string[] {
  return turns.filter((turn) => turn.interrupted).map((turn) => turn.turnId)
}

function buildTimeline(turns: DebriefTurn[]): DebriefTimelineEntry[] {
  return turns.map((turn) => ({
    turnId: turn.turnId,
    question: turn.question,
    durationMs: turn.endedAt === null ? null : turn.endedAt - turn.startedAt
  }))
}

/** Build the complete debrief report purely from session data. Never mutates
   the input and never reads the clock or randomness. */
export function buildDebrief(input: DebriefInput): DebriefReport {
  const { turns, sessionStart, sessionEnd } = input

  const durationMs = Math.max(0, sessionEnd - sessionStart)
  const unanswered = unansweredQuestions(turns)
  const interrupted = interruptedTurns(turns)
  const violations = constraintViolations(turns)
  const avgRevisions = averageRevisions(turns)

  const improvements: string[] = []
  if (unanswered.length > 0) improvements.push(IMPROVEMENT_UNANSWERED)
  if (violations.length > 0) improvements.push(IMPROVEMENT_CONSTRAINTS)
  if (avgRevisions > HIGH_REVISION_THRESHOLD) improvements.push(IMPROVEMENT_REVISIONS)
  if (interrupted.length > 0) improvements.push(IMPROVEMENT_INTERRUPTED)

  const nextPracticePlan: string[] = []
  if (unanswered.length > 0) nextPracticePlan.push(PLAN_UNANSWERED)
  if (violations.length > 0) nextPracticePlan.push(PLAN_CONSTRAINTS)
  if (avgRevisions > HIGH_REVISION_THRESHOLD) nextPracticePlan.push(PLAN_REVISIONS)
  if (interrupted.length > 0) nextPracticePlan.push(PLAN_INTERRUPTED)
  // When nothing is flagged, still give a deterministic forward-looking plan.
  if (nextPracticePlan.length === 0) nextPracticePlan.push(PLAN_CLEAN)

  return {
    durationMs,
    totalQuestions: turns.length,
    answeredCount: turns.filter((turn) => turn.answered).length,
    unansweredQuestions: unanswered,
    interruptedTurns: interrupted,
    constraintViolations: violations,
    averageRevisions: avgRevisions,
    timeline: buildTimeline(turns),
    improvements: dedupe(improvements),
    nextPracticePlan: dedupe(nextPracticePlan)
  }
}

// Preserve first-seen order while removing duplicates.
function dedupe(items: string[]): string[] {
  return items.filter((item, index) => items.indexOf(item) === index)
}

// A live transcript turn as produced by the interview coach: a labeled,
// timestamped line. Kept structurally minimal so this module stays free of a
// dependency on the coach's full state type.
export interface TranscriptTurnLike {
  id: string
  speaker: 'interviewer' | 'candidate' | 'unknown'
  text: string
  timestamp: number
}

/** Derive DebriefTurns from a live transcript. Each interviewer line opens a
   turn; the next candidate line (before another interviewer line) answers it and
   sets the turn's endedAt. A turn is `interrupted` when a new interviewer line
   arrives before any candidate answer. Fields a transcript genuinely cannot
   observe — `answerRevisions` and `constraintsRespected` — take neutral defaults
   (0 / true), so the report never fabricates weaknesses it can't see. */
export function debriefTurnsFromTranscript(turns: TranscriptTurnLike[]): DebriefTurn[] {
  const result: DebriefTurn[] = []
  let open: DebriefTurn | null = null

  for (const turn of turns) {
    const text = turn.text.trim()
    if (!text) continue

    if (turn.speaker === 'interviewer') {
      // A previous unanswered question was cut off by this new one.
      if (open && !open.answered) open.interrupted = true
      open = {
        turnId: turn.id,
        question: text,
        answered: false,
        answerRevisions: 0,
        interrupted: false,
        constraintsRespected: true,
        startedAt: turn.timestamp,
        endedAt: null
      }
      result.push(open)
    } else if (turn.speaker === 'candidate' && open && !open.answered) {
      open.answered = true
      open.endedAt = turn.timestamp
    }
  }

  return result
}
