import type { TranscriptTurn } from './interview-coach'

export interface InterviewStats {
  /** Number of finalized (non-partial, non-empty) turns. */
  totalTurns: number
  interviewerTurns: number
  candidateTurns: number
  unknownTurns: number
  /** Finalized interviewer turns that look like questions. */
  questionCount: number
  /** Elapsed seconds between the first and last finalized turn (0 if <2 turns). */
  durationSeconds: number
  /** Characters spoken by each side (trimmed text length), a better proxy for
     "who talked more" than turn counts. */
  interviewerChars: number
  candidateChars: number
  /** Candidate's share of (interviewer+candidate) spoken characters, 0..1.
     0 when neither side has spoken. Useful to flag "I barely spoke". */
  candidateShare: number
}

// Minimal question heuristic for stats only — counts an interviewer turn as a
// question when it ends with a question mark or contains a common cue. Kept
// independent of the analyzer's richer looksLikeQuestion so this module stays
// a pure, dependency-light reducer.
const QUESTION_MARKS = ['?', '？']
const QUESTION_CUES = [
  '吗',
  '呢',
  '怎么',
  '如何',
  '为什么',
  '什么',
  '是否',
  'what',
  'why',
  'how',
  'ですか',
  'ますか',
  '까',
  '나요',
  'pourquoi',
  'comment'
]

const looksLikeQuestionLite = (text: string): boolean => {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (QUESTION_MARKS.some((m) => trimmed.includes(m))) return true
  const lower = trimmed.toLowerCase()
  return QUESTION_CUES.some((cue) => {
    // Latin-script cues match on word boundaries so "how" doesn't fire on
    // "however"; CJK cues have no word boundaries, so keep substring matching.
    if (/^[a-z][a-z\s-]*$/.test(cue)) {
      const escaped = cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`).test(lower)
    }
    return lower.includes(cue)
  })
}

/** Compute aggregate statistics over a transcript. Pure: derives everything
   from the turns' own timestamps, never reads the clock. */
export function summarizeInterviewStats(turns: TranscriptTurn[]): InterviewStats {
  const finalized = turns.filter((turn) => !turn.isPartial && turn.text.trim().length > 0)

  let interviewerTurns = 0
  let candidateTurns = 0
  let unknownTurns = 0
  let questionCount = 0
  let interviewerChars = 0
  let candidateChars = 0

  for (const turn of finalized) {
    const len = turn.text.trim().length
    if (turn.speaker === 'interviewer') {
      interviewerTurns += 1
      interviewerChars += len
      if (looksLikeQuestionLite(turn.text)) questionCount += 1
    } else if (turn.speaker === 'candidate') {
      candidateTurns += 1
      candidateChars += len
    } else {
      unknownTurns += 1
    }
  }

  let durationSeconds = 0
  if (finalized.length >= 2) {
    const stamps = finalized.map((turn) => turn.timestamp)
    durationSeconds = Math.max(0, Math.round((Math.max(...stamps) - Math.min(...stamps)) / 1000))
  }

  const spokenChars = interviewerChars + candidateChars
  const candidateShare = spokenChars > 0 ? candidateChars / spokenChars : 0

  return {
    totalTurns: finalized.length,
    interviewerTurns,
    candidateTurns,
    unknownTurns,
    questionCount,
    durationSeconds,
    interviewerChars,
    candidateChars,
    candidateShare
  }
}

/** Format a duration in seconds as `Hh Mm Ss` / `Mm Ss` / `Ss`, dropping
   higher units when zero. Interviews often run over an hour, so surface hours. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

// Thresholds for the "you're speaking too little" hint, shared by the live
// panel and the exported record so they never drift apart.
const LOW_SHARE_MIN_CHARS = 80
const LOW_SHARE_RATIO = 0.25

/** Whether to nudge the candidate about speaking too little: only once enough
   has been spoken for the ratio to be meaningful, and their share is low. */
export function isLowCandidateShare(stats: InterviewStats): boolean {
  return (
    stats.interviewerChars + stats.candidateChars >= LOW_SHARE_MIN_CHARS &&
    stats.candidateShare < LOW_SHARE_RATIO
  )
}
