/** Pure state machine for the "mock-interview follow-up chain" (模拟面试与练习模式).

   An AI interviewer asks root questions, then drills down with follow-ups at
   varying difficulty, mixing behavioral / system-design / coding tracks.
   Practice mode reveals a score; formal mode hides it. This module models ONLY
   the flow and rules — no AI calls, no IO.

   Everything is deterministic: no Date.now()/Math.random(). Question ids are
   derived from a monotonic `seq` and callers pass in any timestamps they need.
   Reducers never mutate their inputs — they return fresh state. */

export type InterviewMode = 'practice' | 'formal'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Track = 'behavioral' | 'system-design' | 'coding'

export interface MockQuestion {
  id: string
  track: Track
  difficulty: Difficulty
  prompt: string
  /** null for a root question; otherwise the id of the question it drills into. */
  parentId: string | null
  /** 0 for a root question; parent.depth + 1 for a follow-up. */
  depth: number
}

export interface MockSession {
  mode: InterviewMode
  questions: MockQuestion[]
  /** The question a follow-up would attach to, or null before any question. */
  currentId: string | null
  /** Monotonic counter driving deterministic question ids. */
  seq: number
}

/** Ordered difficulty ladder, easiest first. */
const DIFFICULTY_LADDER: Difficulty[] = ['easy', 'medium', 'hard']

/** Track rotation order for mixed interviews. */
const TRACK_ROTATION: Track[] = ['behavioral', 'system-design', 'coding']

const MIN_SUB_SCORE = 0
const MAX_SUB_SCORE = 5

export function createMockSession(mode: InterviewMode): MockSession {
  return { mode, questions: [], currentId: null, seq: 0 }
}

function findQuestion(session: MockSession, id: string): MockQuestion | undefined {
  return session.questions.find((question) => question.id === id)
}

/** Append a ROOT question (parentId null, depth 0) and make it current. The id
   is derived from the monotonic seq for determinism. */
export function askQuestion(
  session: MockSession,
  { track, difficulty, prompt }: { track: Track; difficulty: Difficulty; prompt: string }
): MockSession {
  const nextSeq = session.seq + 1
  const id = `q-${nextSeq}`
  const question: MockQuestion = { id, track, difficulty, prompt, parentId: null, depth: 0 }
  return {
    ...session,
    questions: [...session.questions, question],
    currentId: id,
    seq: nextSeq
  }
}

/** Append a follow-up as a child of the CURRENT question: parentId = currentId,
   depth = parent.depth + 1, and make it current. The track is inherited from the
   parent; difficulty defaults to the parent's unless one is given.

   Throws when there is no current question — a follow-up must have a parent. */
export function followUp(
  session: MockSession,
  { prompt, difficulty }: { prompt: string; difficulty?: Difficulty }
): MockSession {
  if (session.currentId == null) {
    throw new Error('followUp requires a current question; call askQuestion first')
  }
  const parent = findQuestion(session, session.currentId)
  if (parent == null) {
    throw new Error('followUp could not find the current question')
  }
  const nextSeq = session.seq + 1
  const id = `q-${nextSeq}`
  const question: MockQuestion = {
    id,
    track: parent.track,
    difficulty: difficulty ?? parent.difficulty,
    prompt,
    parentId: parent.id,
    depth: parent.depth + 1
  }
  return {
    ...session,
    questions: [...session.questions, question],
    currentId: id,
    seq: nextSeq
  }
}

/** The ancestor chain from the root down to `questionId` (root..node), so the UI
   can show the drill-down path. Returns an empty array when the id is unknown. */
export function followUpChain(session: MockSession, questionId: string): MockQuestion[] {
  const chain: MockQuestion[] = []
  let cursor = findQuestion(session, questionId)
  while (cursor != null) {
    chain.unshift(cursor)
    cursor = cursor.parentId == null ? undefined : findQuestion(session, cursor.parentId)
  }
  return chain
}

/** Whether a score should be surfaced. Only practice mode reveals a score;
   formal mode hides it (mirrors spoken-coach.shouldShowScore). */
export function shouldScore(mode: InterviewMode): boolean {
  return mode === 'practice'
}

/** Clamp a sub-score into the 0..5 range. */
function clampSubScore(value: number): number {
  return Math.min(MAX_SUB_SCORE, Math.max(MIN_SUB_SCORE, value))
}

/** Score an answer across three sub-scores (each 0..5, clamped). The total is
   the rounded average. `shown` follows shouldScore(mode): the total is always
   computed, but formal mode hides it (shown:false) while practice reveals it. */
export function scoreAnswer(
  input: { structure: number; evidence: number; clarity: number },
  mode: InterviewMode
): { total: number; shown: boolean } {
  const structure = clampSubScore(input.structure)
  const evidence = clampSubScore(input.evidence)
  const clarity = clampSubScore(input.clarity)
  const total = Math.round((structure + evidence + clarity) / 3)
  return { total, shown: shouldScore(mode) }
}

/** Adapt difficulty for the next question. When the last answer went well, step
   up one rung (easy -> medium -> hard, hard stays); otherwise step down
   (hard -> medium -> easy, easy stays). Deterministic. */
export function difficultyLadder(current: Difficulty, wentWell: boolean): Difficulty {
  const index = DIFFICULTY_LADDER.indexOf(current)
  const nextIndex = wentWell ? index + 1 : index - 1
  const clamped = Math.min(DIFFICULTY_LADDER.length - 1, Math.max(0, nextIndex))
  return DIFFICULTY_LADDER[clamped]
}

/** Rotate to the next track for a mixed interview:
   behavioral -> system-design -> coding -> behavioral. */
export function nextTrackRotation(track: Track): Track {
  const index = TRACK_ROTATION.indexOf(track)
  return TRACK_ROTATION[(index + 1) % TRACK_ROTATION.length]
}
