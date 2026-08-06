import { describe, expect, it } from 'vitest'
import {
  REVIEW_ONLY_NOTE,
  branchFrom,
  completenessFlag,
  dedupeSessions,
  facets,
  markReviewOnly,
  searchSessions,
  type SessionRecord
} from '../src/shared/history-index'

/** Deep-clone so a test can prove a function never mutated its input. */
function snapshot<T>(value: T): T {
  return structuredClone(value)
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's1',
    createdAt: 0,
    title: 'Two Sum',
    company: 'Acme',
    role: 'Backend',
    questionType: 'coding',
    text: 'first line\nsecond line\nthird line',
    hasVisualContext: true,
    ...overrides
  }
}

const sessions: SessionRecord[] = [
  makeSession({
    id: 'a',
    title: 'Two Sum',
    company: 'Acme',
    role: 'Backend',
    text: 'array hashmap'
  }),
  makeSession({
    id: 'b',
    title: 'Design a URL shortener',
    company: 'Globex',
    role: 'Backend',
    questionType: 'system-design',
    text: 'consistent hashing'
  }),
  makeSession({
    id: 'c',
    title: 'Tell me about yourself',
    company: 'Acme',
    role: 'Frontend',
    questionType: 'behavioral',
    text: 'leadership story'
  })
]

describe('searchSessions', () => {
  it('matches the query against the title case-insensitively', () => {
    const result = searchSessions(sessions, { query: 'two sum' })
    expect(result.map((s) => s.id)).toEqual(['a'])
  })

  it('matches the query against the text case-insensitively', () => {
    const result = searchSessions(sessions, { query: 'HASHING' })
    expect(result.map((s) => s.id)).toEqual(['b'])
  })

  it('matches the query against the company', () => {
    const result = searchSessions(sessions, { query: 'globex' })
    expect(result.map((s) => s.id)).toEqual(['b'])
  })

  it('AND-combines company and role filters', () => {
    const result = searchSessions(sessions, { company: 'acme', role: 'backend' })
    expect(result.map((s) => s.id)).toEqual(['a'])
  })

  it('AND-combines query with a questionType filter', () => {
    const result = searchSessions(sessions, { query: 'a', questionType: 'behavioral' })
    expect(result.map((s) => s.id)).toEqual(['c'])
  })

  it('returns all sessions for an empty filter', () => {
    expect(searchSessions(sessions, {}).map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('treats a whitespace-only query as no query', () => {
    expect(searchSessions(sessions, { query: '   ' })).toHaveLength(3)
  })

  it('returns [] when nothing matches', () => {
    expect(searchSessions(sessions, { query: 'nonexistent' })).toEqual([])
  })

  it('preserves input order and does not mutate the input', () => {
    const before = snapshot(sessions)
    const result = searchSessions(sessions, { role: 'backend' })
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
    expect(result).not.toBe(sessions)
    expect(sessions).toEqual(before)
  })
})

describe('facets', () => {
  it('returns sorted unique non-empty values', () => {
    expect(facets(sessions)).toEqual({
      companies: ['Acme', 'Globex'],
      roles: ['Backend', 'Frontend'],
      questionTypes: ['behavioral', 'coding', 'system-design']
    })
  })

  it('ignores undefined and blank fields', () => {
    const mixed: SessionRecord[] = [
      makeSession({ id: 'x', company: undefined, role: '  ', questionType: 'coding' }),
      makeSession({ id: 'y', company: 'Initech', role: undefined, questionType: undefined })
    ]
    expect(facets(mixed)).toEqual({
      companies: ['Initech'],
      roles: [],
      questionTypes: ['coding']
    })
  })
})

describe('branchFrom', () => {
  it('copies text up to and including atIndex with a new id and title', () => {
    const source = makeSession({ id: 'src', title: 'Two Sum', text: 'l0\nl1\nl2\nl3' })
    const branch = branchFrom([source], 'src', 1, { newId: 'branch-1', now: 42 })
    expect(branch).not.toBeNull()
    expect(branch?.id).toBe('branch-1')
    expect(branch?.createdAt).toBe(42)
    expect(branch?.title).toBe('Two Sum (branch)')
    expect(branch?.text).toBe('l0\nl1')
  })

  it('clamps atIndex beyond the last line', () => {
    const source = makeSession({ id: 'src', text: 'only\nlines' })
    const branch = branchFrom([source], 'src', 99, { newId: 'b', now: 1 })
    expect(branch?.text).toBe('only\nlines')
  })

  it('returns null when the source id is missing', () => {
    expect(branchFrom(sessions, 'missing', 0, { newId: 'b', now: 1 })).toBeNull()
  })

  it('does not mutate the input array or source record', () => {
    const source = makeSession({ id: 'src', text: 'a\nb\nc' })
    const input = [source]
    const before = snapshot(input)
    branchFrom(input, 'src', 0, { newId: 'b', now: 5 })
    expect(input).toEqual(before)
  })
})

describe('completenessFlag & markReviewOnly', () => {
  it('completenessFlag reflects hasVisualContext', () => {
    expect(completenessFlag(makeSession({ hasVisualContext: true }))).toBe('full')
    expect(completenessFlag(makeSession({ hasVisualContext: false }))).toBe('review-only')
  })

  it('markReviewOnly clears the flag and appends the note', () => {
    const session = makeSession({ hasVisualContext: true, text: 'transcript' })
    const reviewed = markReviewOnly(session)
    expect(reviewed.hasVisualContext).toBe(false)
    expect(reviewed.text).toContain(REVIEW_ONLY_NOTE)
    expect(completenessFlag(reviewed)).toBe('review-only')
  })

  it('markReviewOnly is idempotent and does not mutate the input', () => {
    const session = makeSession({ hasVisualContext: true, text: 'transcript' })
    const before = snapshot(session)
    const once = markReviewOnly(session)
    const twice = markReviewOnly(once)
    expect(twice.text).toBe(once.text)
    expect(session).toEqual(before)
  })
})

describe('dedupeSessions', () => {
  it('keeps the first occurrence by id and preserves order', () => {
    const input: SessionRecord[] = [
      makeSession({ id: 'a', title: 'first a' }),
      makeSession({ id: 'b', title: 'b' }),
      makeSession({ id: 'a', title: 'second a' })
    ]
    const result = dedupeSessions(input)
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
    expect(result[0].title).toBe('first a')
  })

  it('does not mutate the input array', () => {
    const input = [makeSession({ id: 'a' }), makeSession({ id: 'a' })]
    const before = snapshot(input)
    dedupeSessions(input)
    expect(input).toEqual(before)
  })
})

describe('purity: no clock or random source is used', () => {
  it('history-index.ts references neither Date.now nor Math.random', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../src/shared/history-index.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('Date.now')
    expect(source).not.toContain('Math.random')
  })
})
