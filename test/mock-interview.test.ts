import { describe, expect, it } from 'vitest'
import {
  askQuestion,
  createMockSession,
  difficultyLadder,
  followUp,
  followUpChain,
  nextTrackRotation,
  scoreAnswer,
  shouldScore
} from '../src/shared/mock-interview'

describe('createMockSession', () => {
  it('starts empty with no current question and seq 0', () => {
    const session = createMockSession('practice')
    expect(session.mode).toBe('practice')
    expect(session.questions).toEqual([])
    expect(session.currentId).toBeNull()
    expect(session.seq).toBe(0)
  })
})

describe('askQuestion', () => {
  it('appends a root question (depth 0, parentId null) and makes it current', () => {
    const session = askQuestion(createMockSession('practice'), {
      track: 'coding',
      difficulty: 'medium',
      prompt: 'Reverse a linked list'
    })
    expect(session.questions).toHaveLength(1)
    const question = session.questions[0]
    expect(question.id).toBe('q-1')
    expect(question.parentId).toBeNull()
    expect(question.depth).toBe(0)
    expect(question.track).toBe('coding')
    expect(question.difficulty).toBe('medium')
    expect(session.currentId).toBe('q-1')
    expect(session.seq).toBe(1)
  })

  it('derives deterministic ids from seq across multiple root questions', () => {
    let session = createMockSession('formal')
    session = askQuestion(session, { track: 'behavioral', difficulty: 'easy', prompt: 'Q1' })
    session = askQuestion(session, { track: 'coding', difficulty: 'hard', prompt: 'Q2' })
    expect(session.questions.map((q) => q.id)).toEqual(['q-1', 'q-2'])
    expect(session.currentId).toBe('q-2')
    expect(session.seq).toBe(2)
  })
})

describe('followUp', () => {
  it('appends a child (depth+1, parentId=current) inheriting track and defaulting difficulty', () => {
    let session = askQuestion(createMockSession('practice'), {
      track: 'system-design',
      difficulty: 'medium',
      prompt: 'Design a URL shortener'
    })
    session = followUp(session, { prompt: 'How do you handle collisions?' })
    expect(session.questions).toHaveLength(2)
    const child = session.questions[1]
    expect(child.id).toBe('q-2')
    expect(child.parentId).toBe('q-1')
    expect(child.depth).toBe(1)
    expect(child.track).toBe('system-design')
    expect(child.difficulty).toBe('medium')
    expect(session.currentId).toBe('q-2')
  })

  it('uses the given difficulty when provided instead of the parent default', () => {
    let session = askQuestion(createMockSession('practice'), {
      track: 'coding',
      difficulty: 'easy',
      prompt: 'FizzBuzz'
    })
    session = followUp(session, { prompt: 'Now do it in O(1) space', difficulty: 'hard' })
    expect(session.questions[1].difficulty).toBe('hard')
    expect(session.questions[1].track).toBe('coding')
  })

  it('nests follow-ups deeper, incrementing depth off the current question', () => {
    let session = askQuestion(createMockSession('practice'), {
      track: 'behavioral',
      difficulty: 'easy',
      prompt: 'Tell me about a conflict'
    })
    session = followUp(session, { prompt: 'What was your role?' })
    session = followUp(session, { prompt: 'What would you do differently?' })
    expect(session.questions.map((q) => q.depth)).toEqual([0, 1, 2])
    expect(session.questions.map((q) => q.parentId)).toEqual([null, 'q-1', 'q-2'])
    expect(session.currentId).toBe('q-3')
  })

  it('throws when there is no current question', () => {
    expect(() => followUp(createMockSession('practice'), { prompt: 'orphan' })).toThrow()
  })
})

describe('followUpChain', () => {
  it('returns the root..node chain in order', () => {
    let session = askQuestion(createMockSession('practice'), {
      track: 'coding',
      difficulty: 'medium',
      prompt: 'Root'
    })
    session = followUp(session, { prompt: 'Child' })
    session = followUp(session, { prompt: 'Grandchild' })
    const chain = followUpChain(session, 'q-3')
    expect(chain.map((q) => q.id)).toEqual(['q-1', 'q-2', 'q-3'])
  })

  it('returns a single-element chain for a root question', () => {
    const session = askQuestion(createMockSession('practice'), {
      track: 'coding',
      difficulty: 'medium',
      prompt: 'Root'
    })
    expect(followUpChain(session, 'q-1').map((q) => q.id)).toEqual(['q-1'])
  })

  it('returns an empty array for an unknown id', () => {
    const session = askQuestion(createMockSession('practice'), {
      track: 'coding',
      difficulty: 'medium',
      prompt: 'Root'
    })
    expect(followUpChain(session, 'nope')).toEqual([])
  })
})

describe('shouldScore', () => {
  it('is true for practice', () => {
    expect(shouldScore('practice')).toBe(true)
  })

  it('is false for formal', () => {
    expect(shouldScore('formal')).toBe(false)
  })
})

describe('scoreAnswer', () => {
  it('averages the three sub-scores and rounds', () => {
    const result = scoreAnswer({ structure: 4, evidence: 3, clarity: 5 }, 'practice')
    expect(result.total).toBe(4)
    expect(result.shown).toBe(true)
  })

  it('clamps sub-scores above 5 and below 0 before averaging', () => {
    const result = scoreAnswer({ structure: 99, evidence: -10, clarity: 5 }, 'practice')
    // clamped -> (5 + 0 + 5) / 3 = 3.33 -> 3
    expect(result.total).toBe(3)
  })

  it('hides the score in formal mode but still computes the total', () => {
    const result = scoreAnswer({ structure: 5, evidence: 5, clarity: 5 }, 'formal')
    expect(result.total).toBe(5)
    expect(result.shown).toBe(false)
  })

  it('reveals the score in practice mode', () => {
    const result = scoreAnswer({ structure: 2, evidence: 2, clarity: 2 }, 'practice')
    expect(result.total).toBe(2)
    expect(result.shown).toBe(true)
  })
})

describe('difficultyLadder', () => {
  it('steps up when the answer went well', () => {
    expect(difficultyLadder('easy', true)).toBe('medium')
    expect(difficultyLadder('medium', true)).toBe('hard')
  })

  it('saturates at hard when stepping up', () => {
    expect(difficultyLadder('hard', true)).toBe('hard')
  })

  it('steps down when the answer went poorly', () => {
    expect(difficultyLadder('hard', false)).toBe('medium')
    expect(difficultyLadder('medium', false)).toBe('easy')
  })

  it('saturates at easy when stepping down', () => {
    expect(difficultyLadder('easy', false)).toBe('easy')
  })
})

describe('nextTrackRotation', () => {
  it('cycles behavioral -> system-design -> coding -> behavioral', () => {
    expect(nextTrackRotation('behavioral')).toBe('system-design')
    expect(nextTrackRotation('system-design')).toBe('coding')
    expect(nextTrackRotation('coding')).toBe('behavioral')
  })
})

describe('purity', () => {
  it('does not mutate the session on askQuestion or followUp', () => {
    const base = createMockSession('practice')
    const snapshot = structuredClone(base)
    const asked = askQuestion(base, { track: 'coding', difficulty: 'easy', prompt: 'Q1' })
    expect(base).toEqual(snapshot)

    const askedSnapshot = structuredClone(asked)
    followUp(asked, { prompt: 'follow' })
    expect(asked).toEqual(askedSnapshot)
  })

  it('does not mutate the score input object', () => {
    const input = { structure: 3, evidence: 4, clarity: 5 }
    const snapshot = structuredClone(input)
    scoreAnswer(input, 'formal')
    expect(input).toEqual(snapshot)
  })
})
