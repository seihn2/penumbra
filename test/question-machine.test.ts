import { describe, expect, it } from 'vitest'
import {
  amendQuestion,
  createMachine,
  currentQuestion,
  detectQuestion,
  expireQuestion,
  isStaleResponse,
  mergeIntoActive,
  promoteNext,
  setAnswering
} from '../src/shared/question-machine'

describe('createMachine', () => {
  it('starts empty with no active turn and seq 0', () => {
    const machine = createMachine()
    expect(machine.entries).toEqual([])
    expect(machine.activeTurnId).toBeNull()
    expect(machine.seq).toBe(0)
  })
})

describe('detectQuestion', () => {
  it('makes the first question active immediately when nothing is active', () => {
    const machine = detectQuestion(createMachine(), { text: 'Reverse a list', now: 1000 })
    expect(machine.entries).toHaveLength(1)
    const entry = machine.entries[0]
    expect(entry.status).toBe('active')
    expect(entry.turnId).toBe('q-1')
    expect(entry.revision).toBe(0)
    expect(entry.createdAt).toBe(1000)
    expect(machine.activeTurnId).toBe('q-1')
  })

  it('queues a second question as incoming while one is active', () => {
    const first = detectQuestion(createMachine(), { text: 'Q1', now: 1 })
    const second = detectQuestion(first, { text: 'Q2', now: 2 })
    expect(second.entries).toHaveLength(2)
    expect(second.entries[0].status).toBe('active')
    expect(second.entries[1].status).toBe('incoming')
    // active turn does NOT change to the newly detected one
    expect(second.activeTurnId).toBe('q-1')
    expect(second.entries[1].turnId).toBe('q-2')
  })

  it('derives deterministic turnIds from the monotonic seq', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'A', now: 1 })
    machine = detectQuestion(machine, { text: 'B', now: 2 })
    machine = detectQuestion(machine, { text: 'C', now: 3 })
    expect(machine.entries.map((entry) => entry.turnId)).toEqual(['q-1', 'q-2', 'q-3'])
    expect(machine.seq).toBe(3)
  })

  it('keeps entries ordered oldest -> newest', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'first', now: 10 })
    machine = detectQuestion(machine, { text: 'second', now: 20 })
    expect(machine.entries.map((entry) => entry.text)).toEqual(['first', 'second'])
  })
})

describe('amendQuestion', () => {
  it('bumps revision, keeps the same turnId, updates text, and adds no entry', () => {
    const machine = detectQuestion(createMachine(), { text: 'Sort it', now: 1 })
    const amended = amendQuestion(machine, 'q-1', { text: 'Sort it, and it must be stable' })
    expect(amended.entries).toHaveLength(1)
    const entry = amended.entries[0]
    expect(entry.turnId).toBe('q-1')
    expect(entry.revision).toBe(1)
    expect(entry.text).toBe('Sort it, and it must be stable')
    expect(entry.status).toBe('active')
  })

  it('is a no-op for an unknown turnId', () => {
    const machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    const amended = amendQuestion(machine, 'q-999', { text: 'nope' })
    expect(amended).toEqual(machine)
  })
})

describe('promoteNext', () => {
  it('promotes the oldest pending entry to active after the previous one expired', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'Q1', now: 1 })
    machine = detectQuestion(machine, { text: 'Q2', now: 2 })
    machine = detectQuestion(machine, { text: 'Q3', now: 3 })
    machine = expireQuestion(machine, 'q-1')
    machine = promoteNext(machine)
    expect(machine.activeTurnId).toBe('q-2')
    expect(currentQuestion(machine)?.status).toBe('active')
    // the other pending entry is normalised to queued
    expect(machine.entries.find((e) => e.turnId === 'q-3')?.status).toBe('queued')
  })

  it('is a no-op while a live (non-expired) question is still active', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'Q1', now: 1 })
    machine = detectQuestion(machine, { text: 'Q2', now: 2 })
    const after = promoteNext(machine)
    expect(after).toEqual(machine)
    expect(after.activeTurnId).toBe('q-1')
  })

  it('clears the active turn when nothing pending remains after expiry', () => {
    let machine = detectQuestion(createMachine(), { text: 'only', now: 1 })
    machine = expireQuestion(machine, 'q-1')
    machine = promoteNext(machine)
    expect(machine.activeTurnId).toBeNull()
    expect(currentQuestion(machine)).toBeNull()
  })

  it('keeps only one active entry at a time across promotions', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'Q1', now: 1 })
    machine = detectQuestion(machine, { text: 'Q2', now: 2 })
    machine = detectQuestion(machine, { text: 'Q3', now: 3 })
    machine = expireQuestion(machine, 'q-1')
    machine = promoteNext(machine)
    const activeCount = machine.entries.filter((e) => e.status === 'active').length
    expect(activeCount).toBe(1)
  })
})

describe('setAnswering', () => {
  it('marks a known turn as answering', () => {
    const machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    const answering = setAnswering(machine, 'q-1')
    expect(answering.entries[0].status).toBe('answering')
  })

  it('is a no-op for an unknown turnId', () => {
    const machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    expect(setAnswering(machine, 'q-x')).toEqual(machine)
  })
})

describe('expireQuestion', () => {
  it('marks the entry expired and clears activeTurnId when it was active', () => {
    const machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    const expired = expireQuestion(machine, 'q-1')
    expect(expired.entries[0].status).toBe('expired')
    expect(expired.activeTurnId).toBeNull()
  })

  it('currentQuestion moves on after expire + promoteNext', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'Q1', now: 1 })
    machine = detectQuestion(machine, { text: 'Q2', now: 2 })
    expect(currentQuestion(machine)?.turnId).toBe('q-1')
    machine = expireQuestion(machine, 'q-1')
    machine = promoteNext(machine)
    expect(currentQuestion(machine)?.turnId).toBe('q-2')
  })
})

describe('mergeIntoActive', () => {
  it('folds the separate entry text into the active one, bumps revision, drops the entry', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'Design a cache', now: 1 })
    machine = detectQuestion(machine, { text: 'with an LRU policy', now: 2 })
    machine = mergeIntoActive(machine, 'q-2')
    expect(machine.entries).toHaveLength(1)
    const active = currentQuestion(machine)
    expect(active?.turnId).toBe('q-1')
    expect(active?.revision).toBe(1)
    expect(active?.text).toBe('Design a cache with an LRU policy')
  })

  it('is a no-op when there is no active entry', () => {
    let machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    machine = expireQuestion(machine, 'q-1')
    const after = mergeIntoActive(machine, 'q-1')
    expect(after).toEqual(machine)
  })

  it('is a no-op when merging the active entry into itself', () => {
    const machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    expect(mergeIntoActive(machine, 'q-1')).toEqual(machine)
  })
})

describe('isStaleResponse', () => {
  it('returns false when the turn still exists at the same revision', () => {
    const machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    expect(isStaleResponse(machine, 'q-1', 0)).toBe(false)
  })

  it('returns true when the response revision is older than the current revision', () => {
    let machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    machine = amendQuestion(machine, 'q-1', { text: 'Q with a twist' })
    // response was tagged at revision 0, but the entry is now at revision 1
    expect(isStaleResponse(machine, 'q-1', 0)).toBe(true)
    expect(isStaleResponse(machine, 'q-1', 1)).toBe(false)
  })

  it('returns true when the turn is expired', () => {
    let machine = detectQuestion(createMachine(), { text: 'Q', now: 1 })
    machine = expireQuestion(machine, 'q-1')
    expect(isStaleResponse(machine, 'q-1', 0)).toBe(true)
  })

  it('returns true when the turn no longer exists (e.g. merged away)', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'active', now: 1 })
    machine = detectQuestion(machine, { text: 'folded', now: 2 })
    machine = mergeIntoActive(machine, 'q-2')
    expect(isStaleResponse(machine, 'q-2', 0)).toBe(true)
  })
})

describe('purity', () => {
  it('does not mutate inputs across reducer calls', () => {
    let machine = createMachine()
    machine = detectQuestion(machine, { text: 'Q1', now: 1 })
    machine = detectQuestion(machine, { text: 'Q2', now: 2 })
    const snapshot = structuredClone(machine)

    detectQuestion(machine, { text: 'Q3', now: 3 })
    amendQuestion(machine, 'q-1', { text: 'changed' })
    setAnswering(machine, 'q-1')
    expireQuestion(machine, 'q-1')
    promoteNext(machine)
    mergeIntoActive(machine, 'q-2')
    isStaleResponse(machine, 'q-1', 0)

    expect(machine).toEqual(snapshot)
  })
})
