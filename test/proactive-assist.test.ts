import { describe, expect, it } from 'vitest'
import { shouldRunProactiveAssist } from '../src/shared/proactive-assist'

const base = {
  enabled: true,
  hasApiKey: true,
  assistInFlight: false,
  finalizedTurnCount: 3,
  turnCountAtLastProactive: 1,
  recentTurnCount: 3
}

describe('shouldRunProactiveAssist', () => {
  it('runs when enabled, idle, with new turns and content', () => {
    expect(shouldRunProactiveAssist(base)).toBe(true)
  })

  it('does not run when disabled', () => {
    expect(shouldRunProactiveAssist({ ...base, enabled: false })).toBe(false)
  })

  it('does not run without an API key', () => {
    expect(shouldRunProactiveAssist({ ...base, hasApiKey: false })).toBe(false)
  })

  it('does not run while another assist is in flight', () => {
    expect(shouldRunProactiveAssist({ ...base, assistInFlight: true })).toBe(false)
  })

  it('does not run when no new turns since last proactive', () => {
    expect(
      shouldRunProactiveAssist({ ...base, finalizedTurnCount: 5, turnCountAtLastProactive: 5 })
    ).toBe(false)
  })

  it('does not run with no conversation to react to', () => {
    expect(shouldRunProactiveAssist({ ...base, recentTurnCount: 0 })).toBe(false)
  })
})
