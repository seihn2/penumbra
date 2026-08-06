import { describe, expect, it } from 'vitest'
import {
  RESET_LADDER,
  ResetScope,
  canContinueAfterFix,
  escalate,
  minimalScopeFor,
  scopeRank,
  shouldInjectAsAssistantAnswer
} from '../src/shared/recovery-plan'

describe('RESET_LADDER', () => {
  it('is ordered cheapest -> most drastic', () => {
    expect(RESET_LADDER).toEqual([
      'retry-request',
      'reset-question',
      'restart-audio',
      'reload-renderer',
      'restore-window',
      'end-session'
    ])
  })
})

describe('minimalScopeFor — single symptom mapping', () => {
  it('maps failedRequest to retry-request', () => {
    expect(minimalScopeFor({ failedRequest: true })).toBe('retry-request')
  })

  it('maps questionCorrupt to reset-question', () => {
    expect(minimalScopeFor({ questionCorrupt: true })).toBe('reset-question')
  })

  it('maps audioStuck to restart-audio', () => {
    expect(minimalScopeFor({ audioStuck: true })).toBe('restart-audio')
  })

  it('maps rendererUnresponsive to reload-renderer', () => {
    expect(minimalScopeFor({ rendererUnresponsive: true })).toBe('reload-renderer')
  })

  it('maps windowInvisible to restore-window', () => {
    expect(minimalScopeFor({ windowInvisible: true })).toBe('restore-window')
  })

  it('maps sessionCorrupt to end-session', () => {
    expect(minimalScopeFor({ sessionCorrupt: true })).toBe('end-session')
  })

  it('returns null when nothing is broken', () => {
    expect(minimalScopeFor({})).toBe(null)
  })
})

describe('minimalScopeFor — most-drastic required scope wins', () => {
  it('picks reload-renderer over retry-request', () => {
    expect(minimalScopeFor({ failedRequest: true, rendererUnresponsive: true })).toBe(
      'reload-renderer'
    )
  })

  it('picks end-session when session corruption is present with others', () => {
    expect(
      minimalScopeFor({
        failedRequest: true,
        questionCorrupt: true,
        audioStuck: true,
        sessionCorrupt: true
      })
    ).toBe('end-session')
  })

  it('picks restore-window over restart-audio', () => {
    expect(minimalScopeFor({ audioStuck: true, windowInvisible: true })).toBe('restore-window')
  })

  it('picks the most drastic when every symptom is present', () => {
    expect(
      minimalScopeFor({
        failedRequest: true,
        questionCorrupt: true,
        audioStuck: true,
        rendererUnresponsive: true,
        windowInvisible: true,
        sessionCorrupt: true
      })
    ).toBe('end-session')
  })
})

describe('scopeRank', () => {
  it('ranks cheapest as 0 and ascends to most drastic', () => {
    expect(scopeRank('retry-request')).toBe(0)
    expect(scopeRank('reset-question')).toBe(1)
    expect(scopeRank('restart-audio')).toBe(2)
    expect(scopeRank('reload-renderer')).toBe(3)
    expect(scopeRank('restore-window')).toBe(4)
    expect(scopeRank('end-session')).toBe(5)
  })

  it('is strictly increasing along the ladder', () => {
    for (let i = 1; i < RESET_LADDER.length; i++) {
      expect(scopeRank(RESET_LADDER[i])).toBeGreaterThan(scopeRank(RESET_LADDER[i - 1]))
    }
  })
})

describe('escalate', () => {
  it('walks each rung to the next more-drastic scope', () => {
    expect(escalate('retry-request')).toBe('reset-question')
    expect(escalate('reset-question')).toBe('restart-audio')
    expect(escalate('restart-audio')).toBe('reload-renderer')
    expect(escalate('reload-renderer')).toBe('restore-window')
    expect(escalate('restore-window')).toBe('end-session')
  })

  it('returns null past the most drastic scope', () => {
    expect(escalate('end-session')).toBe(null)
  })
})

describe('canContinueAfterFix', () => {
  it('is true for every scope except end-session', () => {
    const resumable: ResetScope[] = [
      'retry-request',
      'reset-question',
      'restart-audio',
      'reload-renderer',
      'restore-window'
    ]
    for (const scope of resumable) {
      expect(canContinueAfterFix({}, scope)).toBe(true)
    }
  })

  it('is false for end-session', () => {
    expect(canContinueAfterFix({ sessionCorrupt: true }, 'end-session')).toBe(false)
  })
})

describe('shouldInjectAsAssistantAnswer', () => {
  it('always returns false regardless of input', () => {
    expect(shouldInjectAsAssistantAnswer(true)).toBe(false)
    expect(shouldInjectAsAssistantAnswer(false)).toBe(false)
  })
})

describe('purity / determinism', () => {
  it('returns identical results across repeated calls', () => {
    const problem = { audioStuck: true, failedRequest: true }
    expect(minimalScopeFor(problem)).toBe(minimalScopeFor(problem))
    expect(escalate('restart-audio')).toBe(escalate('restart-audio'))
  })

  it('does not mutate the input problem', () => {
    const problem = { failedRequest: true }
    minimalScopeFor(problem)
    expect(problem).toEqual({ failedRequest: true })
  })
})
