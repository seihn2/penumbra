import { describe, expect, it } from 'vitest'
import {
  AUDIO_ALL_DISCONNECTED_SOURCE,
  AttentionEvent,
  dedupe,
  partition,
  severityRank,
  shouldPreempt
} from '../src/shared/attention-event'

function makeEvent(overrides: Partial<AttentionEvent> = {}): AttentionEvent {
  return {
    id: 'e1',
    source: 'test',
    severity: 'info',
    affectedCapability: 'audio',
    requiresImmediate: false,
    dedupeKey: 'k1',
    mayInterruptSpeech: false,
    ...overrides
  }
}

describe('severityRank', () => {
  it('orders critical > warn > info', () => {
    expect(severityRank('critical')).toBeGreaterThan(severityRank('warn'))
    expect(severityRank('warn')).toBeGreaterThan(severityRank('info'))
  })
})

describe('shouldPreempt — the four preempt conditions', () => {
  it('preempts when all audio sources are disconnected', () => {
    const event = makeEvent({
      affectedCapability: 'audio',
      severity: 'critical',
      source: AUDIO_ALL_DISCONNECTED_SOURCE
    })
    expect(shouldPreempt(event)).toBe(true)
  })

  it('preempts when the current answer cannot continue', () => {
    const event = makeEvent({ affectedCapability: 'answer', severity: 'critical' })
    expect(shouldPreempt(event)).toBe(true)
  })

  it('preempts when stealth / content-protection is turned off', () => {
    const event = makeEvent({ affectedCapability: 'stealth', severity: 'warn' })
    expect(shouldPreempt(event)).toBe(true)
  })

  it('preempts on a current question conflict', () => {
    const event = makeEvent({ affectedCapability: 'question', severity: 'critical' })
    expect(shouldPreempt(event)).toBe(true)
  })
})

describe('shouldPreempt — non-preempting cases', () => {
  it('does not preempt for an info event', () => {
    expect(shouldPreempt(makeEvent({ severity: 'info' }))).toBe(false)
  })

  it('does not preempt for a generic warn event', () => {
    expect(shouldPreempt(makeEvent({ affectedCapability: 'answer', severity: 'warn' }))).toBe(false)
  })

  it('does not preempt when a single audio source drops (not all)', () => {
    const event = makeEvent({
      affectedCapability: 'audio',
      severity: 'critical',
      source: 'microphone'
    })
    expect(shouldPreempt(event)).toBe(false)
  })

  it('does not preempt for a non-critical question event', () => {
    expect(shouldPreempt(makeEvent({ affectedCapability: 'question', severity: 'warn' }))).toBe(
      false
    )
  })

  it('does not preempt for an unknown capability', () => {
    expect(shouldPreempt(makeEvent({ affectedCapability: 'battery', severity: 'critical' }))).toBe(
      false
    )
  })
})

describe('dedupe', () => {
  it('collapses events sharing a dedupeKey, keeping the highest severity', () => {
    const events = [
      makeEvent({ id: 'a', dedupeKey: 'audio', severity: 'info' }),
      makeEvent({ id: 'b', dedupeKey: 'audio', severity: 'critical' }),
      makeEvent({ id: 'c', dedupeKey: 'audio', severity: 'warn' })
    ]
    const result = dedupe(events)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
    expect(result[0].severity).toBe('critical')
  })

  it('keeps the first-seen event on a severity tie', () => {
    const events = [
      makeEvent({ id: 'a', dedupeKey: 'k', severity: 'warn' }),
      makeEvent({ id: 'b', dedupeKey: 'k', severity: 'warn' })
    ]
    const result = dedupe(events)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('preserves first-seen order across distinct keys', () => {
    const events = [
      makeEvent({ id: 'a', dedupeKey: 'k1' }),
      makeEvent({ id: 'b', dedupeKey: 'k2' }),
      makeEvent({ id: 'c', dedupeKey: 'k1', severity: 'critical' }),
      makeEvent({ id: 'd', dedupeKey: 'k3' })
    ]
    const result = dedupe(events)
    expect(result.map((e) => e.dedupeKey)).toEqual(['k1', 'k2', 'k3'])
    // The higher-severity duplicate replaces k1's value in place.
    expect(result[0].id).toBe('c')
  })

  it('returns an empty array for no events', () => {
    expect(dedupe([])).toEqual([])
  })

  it('does not mutate the input array or its events', () => {
    const events = [
      makeEvent({ id: 'a', dedupeKey: 'k', severity: 'info' }),
      makeEvent({ id: 'b', dedupeKey: 'k', severity: 'critical' })
    ]
    const snapshot = JSON.parse(JSON.stringify(events))
    dedupe(events)
    expect(events).toEqual(snapshot)
    expect(events).toHaveLength(2)
  })
})

describe('partition', () => {
  it('routes preempting and later events correctly', () => {
    const events = [
      makeEvent({ id: 'info', dedupeKey: 'a', severity: 'info' }),
      makeEvent({ id: 'stealth', dedupeKey: 'b', affectedCapability: 'stealth' }),
      makeEvent({
        id: 'answer',
        dedupeKey: 'c',
        affectedCapability: 'answer',
        severity: 'critical'
      })
    ]
    const { preempting, later } = partition(events)
    expect(preempting.map((e) => e.id)).toEqual(['stealth', 'answer'])
    expect(later.map((e) => e.id)).toEqual(['info'])
  })

  it('dedupes before partitioning so a concern appears in exactly one group', () => {
    const events = [
      makeEvent({ id: 'low', dedupeKey: 'answer', affectedCapability: 'answer', severity: 'warn' }),
      makeEvent({
        id: 'high',
        dedupeKey: 'answer',
        affectedCapability: 'answer',
        severity: 'critical'
      })
    ]
    const { preempting, later } = partition(events)
    expect(preempting.map((e) => e.id)).toEqual(['high'])
    expect(later).toEqual([])
  })

  it('preserves relative order within each group (stable)', () => {
    const events = [
      makeEvent({ id: 's1', dedupeKey: 'k1', affectedCapability: 'stealth' }),
      makeEvent({ id: 'i1', dedupeKey: 'k2', severity: 'info' }),
      makeEvent({ id: 's2', dedupeKey: 'k3', affectedCapability: 'stealth' }),
      makeEvent({ id: 'i2', dedupeKey: 'k4', severity: 'warn' })
    ]
    const { preempting, later } = partition(events)
    expect(preempting.map((e) => e.id)).toEqual(['s1', 's2'])
    expect(later.map((e) => e.id)).toEqual(['i1', 'i2'])
  })

  it('does not mutate the input array', () => {
    const events = [
      makeEvent({ id: 'a', dedupeKey: 'k1', affectedCapability: 'stealth' }),
      makeEvent({ id: 'b', dedupeKey: 'k2', severity: 'info' })
    ]
    const snapshot = JSON.parse(JSON.stringify(events))
    partition(events)
    expect(events).toEqual(snapshot)
  })
})
