import { describe, expect, it } from 'vitest'
import { shouldDistillMemory } from '../src/shared/memory-distill-gate'

const base = {
  enabled: true,
  hasApiKey: true,
  finalizedTurnCount: 10,
  lastDistillAtTurn: 0,
  intervalTurns: 10,
  recentTurnCount: 5
}

describe('shouldDistillMemory', () => {
  it('runs once the interval of new turns has accrued', () => {
    expect(shouldDistillMemory(base)).toBe(true)
  })

  it('is off when the feature flag is disabled', () => {
    expect(shouldDistillMemory({ ...base, enabled: false })).toBe(false)
  })

  it('is off without an API key (the model call would fail)', () => {
    expect(shouldDistillMemory({ ...base, hasApiKey: false })).toBe(false)
  })

  it('does not run before the interval is reached', () => {
    expect(shouldDistillMemory({ ...base, finalizedTurnCount: 9, lastDistillAtTurn: 0 })).toBe(
      false
    )
  })

  it('runs again only after another full interval since the last pass', () => {
    expect(shouldDistillMemory({ ...base, finalizedTurnCount: 19, lastDistillAtTurn: 10 })).toBe(
      false
    )
    expect(shouldDistillMemory({ ...base, finalizedTurnCount: 20, lastDistillAtTurn: 10 })).toBe(
      true
    )
  })

  it('is off when there is no conversation to distill from', () => {
    expect(shouldDistillMemory({ ...base, recentTurnCount: 0 })).toBe(false)
  })

  it('is off for a non-positive interval (guards against misconfig)', () => {
    expect(shouldDistillMemory({ ...base, intervalTurns: 0 })).toBe(false)
  })
})
