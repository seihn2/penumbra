/** Pure data model + reducer for the interview session hierarchy.

   The hierarchy is four levels deep:

     InterviewSession
      └── ProblemSegment    (one interview problem / topic)
           └── Turn         (one interviewer question + the exchange around it)
                └── AnswerRevision  (a versioned answer to that turn)

   Every operation here is a pure function: it takes the current state (plus any
   input) and returns a brand-new state without mutating its arguments. That
   keeps the semantics testable and lets the caller diff old vs. new state.

   Determinism: no function reads the clock or a random source. Callers pass a
   `now: number` timestamp for anything that stamps `createdAt`, and ids are
   derived from a monotonic `seq` counter carried on the session. */

export type SessionStatus = 'active' | 'paused' | 'ended'

export type TurnStatus = 'pending' | 'answering' | 'answered' | 'stale'

export type Speaker = 'interviewer' | 'candidate' | 'unknown'

export interface AnswerRevision {
  id: string
  createdAt: number
  text: string
  error?: boolean
}

export interface Turn {
  id: string
  createdAt: number
  speaker: Speaker
  questionText: string
  status: TurnStatus
  revisions: AnswerRevision[]
}

export interface ProblemSegment {
  id: string
  createdAt: number
  title: string
  turns: Turn[]
}

export interface InterviewSession {
  id: string
  createdAt: number
  status: SessionStatus
  /** Monotonic counter used to mint deterministic child ids. */
  seq: number
  segments: ProblemSegment[]
}

/** Create an empty session. `now` stamps both the session id counter and
    `createdAt`; the session id itself is provided by the caller so tests stay
    deterministic. */
export function createSession(id = 'session', now = 0): InterviewSession {
  return {
    id,
    createdAt: now,
    status: 'active',
    seq: 0,
    segments: []
  }
}

/** Append a NEW problem segment. Prior segments/turns/revisions are preserved —
    this only adds to the timeline, it never clears earlier problems. */
export function startNewProblem(
  session: InterviewSession,
  input: { title?: string },
  now = 0
): InterviewSession {
  const seq = session.seq + 1
  const segment: ProblemSegment = {
    id: `${session.id}-segment-${seq}`,
    createdAt: now,
    title: input.title ?? '',
    turns: []
  }
  return {
    ...session,
    seq,
    segments: [...session.segments, segment]
  }
}

/** Append a Turn to the LAST segment. If the session has no segment yet, an
    untitled segment is created first (using the same tick). */
export function addTurn(
  session: InterviewSession,
  input: { questionText: string; speaker?: Speaker },
  now = 0
): InterviewSession {
  const base = session.segments.length === 0 ? startNewProblem(session, {}, now) : session
  const seq = base.seq + 1
  const turn: Turn = {
    id: `${base.id}-turn-${seq}`,
    createdAt: now,
    speaker: input.speaker ?? 'interviewer',
    questionText: input.questionText,
    status: 'pending',
    revisions: []
  }
  const lastIndex = base.segments.length - 1
  const segments = base.segments.map((segment, index) =>
    index === lastIndex ? { ...segment, turns: [...segment.turns, turn] } : segment
  )
  return { ...base, seq, segments }
}

/** Append a new AnswerRevision to a turn WITHOUT removing prior revisions.
    This is the "re-answer" path: the question stays, only a new answer version
    is created. Marks the turn 'answered'. Returns the session unchanged if the
    turn id is not found. */
export function addAnswerRevision(
  session: InterviewSession,
  turnId: string,
  input: { text: string; error?: boolean },
  now = 0
): InterviewSession {
  if (!findTurn(session, turnId)) return session
  const seq = session.seq + 1
  const revision: AnswerRevision = {
    id: `${session.id}-revision-${seq}`,
    createdAt: now,
    text: input.text,
    ...(input.error ? { error: true } : {})
  }
  const segments = mapTurns(session, turnId, (turn) => ({
    ...turn,
    status: 'answered',
    revisions: [...turn.revisions, revision]
  }))
  return { ...session, seq, segments }
}

/** Mark a turn 'stale' — used when the problem meaning changed so previously
    given answers are no longer valid. Returns the session unchanged if the turn
    id is not found. */
export function markTurnStale(session: InterviewSession, turnId: string): InterviewSession {
  if (!findTurn(session, turnId)) return session
  const segments = mapTurns(session, turnId, (turn) => ({ ...turn, status: 'stale' }))
  return { ...session, segments }
}

/** Set the turn's status without touching its revisions. Returns the session
    unchanged if the turn id is not found. */
export function setTurnStatus(
  session: InterviewSession,
  turnId: string,
  status: TurnStatus
): InterviewSession {
  if (!findTurn(session, turnId)) return session
  const segments = mapTurns(session, turnId, (turn) => ({ ...turn, status }))
  return { ...session, segments }
}

/** Pause the session, preserving all state. */
export function pauseSession(session: InterviewSession): InterviewSession {
  return { ...session, status: 'paused' }
}

/** Resume a paused session. */
export function resumeSession(session: InterviewSession): InterviewSession {
  return { ...session, status: 'active' }
}

/** End the session, preserving all state. */
export function endSession(session: InterviewSession): InterviewSession {
  return { ...session, status: 'ended' }
}

/** The most recent segment, or null when the session has none. */
export function getCurrentSegment(session: InterviewSession): ProblemSegment | null {
  return session.segments.length === 0 ? null : session.segments[session.segments.length - 1]
}

/** The most recent turn of the most recent segment, or null when there is
    none. */
export function getCurrentTurn(session: InterviewSession): Turn | null {
  const segment = getCurrentSegment(session)
  if (!segment || segment.turns.length === 0) return null
  return segment.turns[segment.turns.length - 1]
}

/** The latest AnswerRevision of a turn, or null when the turn has none. */
export function getLatestRevision(turn: Turn): AnswerRevision | null {
  return turn.revisions.length === 0 ? null : turn.revisions[turn.revisions.length - 1]
}

/** Locate a turn anywhere in the session by id, or null. */
export function findTurn(session: InterviewSession, turnId: string): Turn | null {
  for (const segment of session.segments) {
    for (const turn of segment.turns) {
      if (turn.id === turnId) return turn
    }
  }
  return null
}

/** Rebuild the segments array, applying `update` to the matching turn only and
    leaving every other segment/turn referentially untouched. */
function mapTurns(
  session: InterviewSession,
  turnId: string,
  update: (turn: Turn) => Turn
): ProblemSegment[] {
  return session.segments.map((segment) => {
    if (!segment.turns.some((turn) => turn.id === turnId)) return segment
    return {
      ...segment,
      turns: segment.turns.map((turn) => (turn.id === turnId ? update(turn) : turn))
    }
  })
}
