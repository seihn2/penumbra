import { looksLikeQuestion, type SpeakerRole } from './interview-coach'
import {
  amendQuestion,
  createMachine,
  currentQuestion,
  detectQuestion,
  expireQuestion,
  setAnswering,
  type QuestionMachine
} from './question-machine'

const MAX_BUFFER_SEGMENTS = 6
const MAX_BUFFER_CHARS = 900
const NEW_QUESTION_GAP_MS = 30000

export interface InterviewQuestionSnapshot {
  turnId: string
  revision: number
  question: string
  timestamp: number
}

export interface InterviewAssistTag {
  question: string
  timestamp: number
  turnId?: string
  revision?: number
}

export interface InterviewQuestionDetectionState {
  machine: QuestionMachine
  interviewerBuffer: string[]
  lastSpeaker: SpeakerRole
  lastTurnAt: number | null
}

export interface InterviewQuestionDetectionResult {
  state: InterviewQuestionDetectionState
  detected: InterviewQuestionSnapshot | null
}

export function createInterviewQuestionDetectionState(): InterviewQuestionDetectionState {
  return {
    machine: createMachine(),
    interviewerBuffer: [],
    lastSpeaker: 'unknown',
    lastTurnAt: null
  }
}

/**
 * Consume one finalized transcript turn and detect/amend interviewer questions.
 * Consecutive interviewer lines are one candidate buffer; a candidate turn
 * closes that buffer and marks the current question as being answered.
 */
export function processFinalInterviewTurn(
  state: InterviewQuestionDetectionState,
  input: { speaker: SpeakerRole; text: string; now: number }
): InterviewQuestionDetectionResult {
  const text = input.text.trim()
  if (!text) return { state, detected: null }

  if (input.speaker !== 'interviewer') {
    let machine = state.machine
    if (input.speaker === 'candidate') {
      const active = currentQuestion(machine)
      if (active) machine = setAnswering(machine, active.turnId)
    }
    return {
      state: {
        machine,
        interviewerBuffer: [],
        lastSpeaker: input.speaker,
        lastTurnAt: input.now
      },
      detected: null
    }
  }

  const gapSinceLastTurn = state.lastTurnAt == null ? 0 : input.now - state.lastTurnAt
  const continuingInterviewer =
    state.lastSpeaker === 'interviewer' && gapSinceLastTurn < NEW_QUESTION_GAP_MS
  const interviewerBuffer = appendToBuffer(
    continuingInterviewer ? state.interviewerBuffer : [],
    text
  )
  const question = interviewerBuffer.join(' ').trim()
  let machine = state.machine
  let active = currentQuestion(machine)

  // A candidate response definitively closes the prior question. A long gap
  // also prevents a stale unanswered question from absorbing a later topic.
  if (
    active &&
    (active.status === 'answering' ||
      (state.lastTurnAt != null && gapSinceLastTurn >= NEW_QUESTION_GAP_MS))
  ) {
    machine = expireQuestion(machine, active.turnId)
    active = null
  }

  if (!looksLikeQuestion(question)) {
    return {
      state: { machine, interviewerBuffer, lastSpeaker: 'interviewer', lastTurnAt: input.now },
      detected: null
    }
  }

  if (active) {
    machine = amendQuestion(machine, active.turnId, { text: question })
  } else {
    machine = detectQuestion(machine, { text: question, now: input.now })
  }

  const detected = currentQuestion(machine)
  return {
    state: { machine, interviewerBuffer, lastSpeaker: 'interviewer', lastTurnAt: input.now },
    detected: detected
      ? {
          turnId: detected.turnId,
          revision: detected.revision,
          question: detected.text,
          timestamp: input.now
        }
      : null
  }
}

/** Manual “Ask AI” fallback: turn the supplied interviewer text into the
 * current tracked question even when the heuristic did not classify it. */
export function forceInterviewQuestion(
  state: InterviewQuestionDetectionState,
  input: { text: string; now: number }
): InterviewQuestionDetectionResult {
  const question = input.text.trim()
  if (!question) return { state, detected: null }
  let machine = state.machine
  let active = currentQuestion(machine)
  if (active?.status === 'answering') {
    machine = expireQuestion(machine, active.turnId)
    active = null
  }
  machine = active
    ? amendQuestion(machine, active.turnId, { text: question })
    : detectQuestion(machine, { text: question, now: input.now })
  const detected = currentQuestion(machine)
  return {
    state: {
      machine,
      interviewerBuffer: [question],
      lastSpeaker: 'interviewer',
      lastTurnAt: input.now
    },
    detected: detected
      ? {
          turnId: detected.turnId,
          revision: detected.revision,
          question: detected.text,
          timestamp: input.now
        }
      : null
  }
}

function appendToBuffer(segments: string[], text: string): string[] {
  const next = [...segments, text].slice(-MAX_BUFFER_SEGMENTS)
  while (next.length > 1 && next.join(' ').length > MAX_BUFFER_CHARS) next.shift()
  return next
}
