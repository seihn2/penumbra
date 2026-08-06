import { describe, expect, it } from 'vitest'
import {
  addAnswerRevision,
  addTurn,
  createSession,
  endSession,
  getCurrentSegment,
  getCurrentTurn,
  getLatestRevision,
  markTurnStale,
  pauseSession,
  resumeSession,
  setTurnStatus,
  startNewProblem,
  type InterviewSession
} from '../src/shared/session-model'

/** Deep-clone a session so a test can compare against a pristine snapshot and
    prove the reducer never mutated the input. */
function snapshot(session: InterviewSession): InterviewSession {
  return structuredClone(session)
}

describe('session-model', () => {
  it('creates an empty active session', () => {
    const session = createSession('s1', 100)
    expect(session).toEqual({
      id: 's1',
      createdAt: 100,
      status: 'active',
      seq: 0,
      segments: []
    })
  })

  it('startNewProblem appends a segment with the given title', () => {
    const session = startNewProblem(createSession('s1'), { title: 'Two Sum' }, 5)
    expect(session.segments).toHaveLength(1)
    expect(session.segments[0].title).toBe('Two Sum')
    expect(session.segments[0].createdAt).toBe(5)
    expect(session.segments[0].turns).toEqual([])
  })

  it('startNewProblem defaults the title to an empty string', () => {
    const session = startNewProblem(createSession('s1'), {})
    expect(session.segments[0].title).toBe('')
  })

  it('startNewProblem preserves all prior segments and their content (new problem, not clear)', () => {
    let session = createSession('s1')
    session = startNewProblem(session, { title: 'P1' }, 1)
    session = addTurn(session, { questionText: 'Q1', speaker: 'interviewer' }, 2)
    const firstTurnId = getCurrentTurn(session)!.id
    session = addAnswerRevision(session, firstTurnId, { text: 'A1' }, 3)

    const before = snapshot(session)
    const next = startNewProblem(session, { title: 'P2' }, 4)

    // The prior problem is fully retained.
    expect(next.segments).toHaveLength(2)
    expect(next.segments[0]).toEqual(before.segments[0])
    expect(next.segments[0].turns[0].revisions).toHaveLength(1)
    // The new problem is empty.
    expect(next.segments[1].title).toBe('P2')
    expect(next.segments[1].turns).toEqual([])
    // Original untouched.
    expect(session).toEqual(before)
  })

  it('addTurn creates a segment first when none exists', () => {
    const session = addTurn(createSession('s1'), { questionText: 'Hello?' }, 7)
    expect(session.segments).toHaveLength(1)
    expect(session.segments[0].turns).toHaveLength(1)
    expect(session.segments[0].turns[0].questionText).toBe('Hello?')
    expect(session.segments[0].turns[0].status).toBe('pending')
    expect(session.segments[0].turns[0].speaker).toBe('interviewer')
  })

  it('addTurn appends to the LAST segment only', () => {
    let session = createSession('s1')
    session = startNewProblem(session, { title: 'P1' }, 1)
    session = startNewProblem(session, { title: 'P2' }, 2)
    session = addTurn(session, { questionText: 'Q', speaker: 'candidate' }, 3)

    expect(session.segments[0].turns).toHaveLength(0)
    expect(session.segments[1].turns).toHaveLength(1)
    expect(session.segments[1].turns[0].speaker).toBe('candidate')
  })

  it('addAnswerRevision appends a revision and keeps prior revisions (re-answer)', () => {
    let session = addTurn(createSession('s1'), { questionText: 'Explain BFS' }, 1)
    const turnId = getCurrentTurn(session)!.id
    session = addAnswerRevision(session, turnId, { text: 'first try' }, 2)

    const before = snapshot(session)
    const next = addAnswerRevision(session, turnId, { text: 'second try' }, 3)

    const turn = getCurrentTurn(next)!
    // Question text is unchanged.
    expect(turn.questionText).toBe('Explain BFS')
    // Both revisions are present, in order.
    expect(turn.revisions).toHaveLength(2)
    expect(turn.revisions[0].text).toBe('first try')
    expect(turn.revisions[1].text).toBe('second try')
    expect(turn.status).toBe('answered')
    // Original untouched.
    expect(session).toEqual(before)
  })

  it('addAnswerRevision records an error flag only when requested', () => {
    let session = addTurn(createSession('s1'), { questionText: 'Q' }, 1)
    const turnId = getCurrentTurn(session)!.id
    session = addAnswerRevision(session, turnId, { text: 'ok' }, 2)
    session = addAnswerRevision(session, turnId, { text: 'boom', error: true }, 3)

    const turn = getCurrentTurn(session)!
    expect(turn.revisions[0].error).toBeUndefined()
    expect(turn.revisions[1].error).toBe(true)
  })

  it('addAnswerRevision returns the session unchanged for an unknown turn id', () => {
    const session = addTurn(createSession('s1'), { questionText: 'Q' }, 1)
    const before = snapshot(session)
    const next = addAnswerRevision(session, 'nope', { text: 'x' }, 2)
    expect(next).toBe(session)
    expect(session).toEqual(before)
  })

  it('markTurnStale sets status to stale but keeps question and revisions', () => {
    let session = addTurn(createSession('s1'), { questionText: 'Reverse a list' }, 1)
    const turnId = getCurrentTurn(session)!.id
    session = addAnswerRevision(session, turnId, { text: 'answer' }, 2)

    const before = snapshot(session)
    const next = markTurnStale(session, turnId)

    const turn = getCurrentTurn(next)!
    expect(turn.status).toBe('stale')
    expect(turn.questionText).toBe('Reverse a list')
    expect(turn.revisions).toHaveLength(1)
    expect(session).toEqual(before)
  })

  it('markTurnStale returns the session unchanged for an unknown turn id', () => {
    const session = addTurn(createSession('s1'), { questionText: 'Q' }, 1)
    expect(markTurnStale(session, 'missing')).toBe(session)
  })

  it('setTurnStatus updates only the status', () => {
    const session = addTurn(createSession('s1'), { questionText: 'Q' }, 1)
    const turnId = getCurrentTurn(session)!.id
    const next = setTurnStatus(session, turnId, 'answering')
    expect(getCurrentTurn(next)!.status).toBe('answering')
  })

  it('pauseSession / resumeSession / endSession change status while preserving state', () => {
    const session = addTurn(createSession('s1'), { questionText: 'Q' }, 1)
    const before = snapshot(session)

    const paused = pauseSession(session)
    expect(paused.status).toBe('paused')
    expect(paused.segments).toEqual(before.segments)

    const resumed = resumeSession(paused)
    expect(resumed.status).toBe('active')

    const ended = endSession(session)
    expect(ended.status).toBe('ended')
    expect(ended.segments).toEqual(before.segments)

    // Original untouched by any of these.
    expect(session).toEqual(before)
  })

  it('getCurrentSegment / getCurrentTurn return null on an empty session', () => {
    const session = createSession('s1')
    expect(getCurrentSegment(session)).toBeNull()
    expect(getCurrentTurn(session)).toBeNull()
  })

  it('getCurrentTurn returns null when the last segment has no turns', () => {
    const session = startNewProblem(createSession('s1'), { title: 'P1' }, 1)
    expect(getCurrentSegment(session)).not.toBeNull()
    expect(getCurrentTurn(session)).toBeNull()
  })

  it('getLatestRevision returns the last revision or null', () => {
    let session = addTurn(createSession('s1'), { questionText: 'Q' }, 1)
    const turnId = getCurrentTurn(session)!.id
    expect(getLatestRevision(getCurrentTurn(session)!)).toBeNull()

    session = addAnswerRevision(session, turnId, { text: 'v1' }, 2)
    session = addAnswerRevision(session, turnId, { text: 'v2' }, 3)
    expect(getLatestRevision(getCurrentTurn(session)!)!.text).toBe('v2')
  })

  it('mints unique deterministic ids via the seq counter', () => {
    let session = createSession('s1')
    session = startNewProblem(session, { title: 'P1' }, 1)
    session = addTurn(session, { questionText: 'Q1' }, 2)
    const turnId = getCurrentTurn(session)!.id
    session = addAnswerRevision(session, turnId, { text: 'v1' }, 3)
    session = addAnswerRevision(session, turnId, { text: 'v2' }, 4)

    const ids = [
      session.segments[0].id,
      session.segments[0].turns[0].id,
      session.segments[0].turns[0].revisions[0].id,
      session.segments[0].turns[0].revisions[1].id
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(session.seq).toBe(4)
  })

  it('supports a full multi-problem session flow', () => {
    let session = createSession('s1', 0)

    // Problem 1 with an answer.
    session = startNewProblem(session, { title: 'Arrays' }, 1)
    session = addTurn(session, { questionText: 'Two Sum?' }, 2)
    const t1 = getCurrentTurn(session)!.id
    session = addAnswerRevision(session, t1, { text: 'brute force' }, 3)
    session = addAnswerRevision(session, t1, { text: 'hash map' }, 4)

    // Problem 2 — prior problem retained.
    session = startNewProblem(session, { title: 'Graphs' }, 5)
    session = addTurn(session, { questionText: 'Detect a cycle?' }, 6)
    const t2 = getCurrentTurn(session)!.id
    session = markTurnStale(session, t2)

    expect(session.segments).toHaveLength(2)
    expect(session.segments[0].turns[0].revisions).toHaveLength(2)
    expect(session.segments[1].turns[0].status).toBe('stale')
    expect(getCurrentSegment(session)!.title).toBe('Graphs')
  })
})
