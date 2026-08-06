import { describe, expect, it } from 'vitest'
import {
  MAX_BACKOFF_MS,
  backoffDelayMs,
  classifyFailure,
  decideRecovery,
  nextRetryState,
  shouldPreservePartial
} from '../src/shared/retry-policy'

describe('classifyFailure', () => {
  it('maps HTTP 429 to rate-limited', () => {
    expect(classifyFailure({ statusCode: 429 })).toBe('rate-limited')
  })

  it('maps a rate-limit message to rate-limited', () => {
    expect(classifyFailure({ message: 'Rate limit exceeded' })).toBe('rate-limited')
    expect(classifyFailure({ message: 'Too many requests' })).toBe('rate-limited')
  })

  it('maps AbortError name (timeout-driven abort) to timeout', () => {
    expect(classifyFailure({ name: 'AbortError' })).toBe('timeout')
  })

  it('maps the AI_STREAM_TIMEOUT message to timeout', () => {
    expect(classifyFailure({ message: 'AI_STREAM_TIMEOUT' })).toBe('timeout')
    expect(classifyFailure({ name: 'TimeoutError' })).toBe('timeout')
    expect(classifyFailure({ message: 'request timed out' })).toBe('timeout')
  })

  it('maps several network-ish messages to network', () => {
    expect(classifyFailure({ message: 'fetch failed' })).toBe('network')
    expect(classifyFailure({ message: 'connect ECONNREFUSED 127.0.0.1:443' })).toBe('network')
    expect(classifyFailure({ message: 'getaddrinfo ENOTFOUND api.example.com' })).toBe('network')
    expect(classifyFailure({ message: 'network error' })).toBe('network')
  })

  it('maps HTTP 404 and model-not-found messages to model-unavailable', () => {
    expect(classifyFailure({ statusCode: 404 })).toBe('model-unavailable')
    expect(classifyFailure({ message: 'Model not found' })).toBe('model-unavailable')
    expect(classifyFailure({ message: 'no such model: gpt-9' })).toBe('model-unavailable')
  })

  it('maps an explicit user abort to aborted', () => {
    expect(classifyFailure({ message: 'user-aborted' })).toBe('aborted')
    expect(classifyFailure({ name: 'UserAbort' })).toBe('aborted')
    expect(classifyFailure({ message: 'cancelled by user' })).toBe('aborted')
  })

  it('falls back to unknown for an unrecognized failure', () => {
    expect(classifyFailure({})).toBe('unknown')
    expect(classifyFailure({ message: 'something weird happened' })).toBe('unknown')
    expect(classifyFailure({ statusCode: 500 })).toBe('unknown')
  })

  it('is case-insensitive when matching name and message', () => {
    expect(classifyFailure({ name: 'aborterror' })).toBe('timeout')
    expect(classifyFailure({ message: 'FETCH FAILED' })).toBe('network')
  })

  it('honours precedence when multiple hints are present', () => {
    // User abort beats everything, even a 429 status.
    expect(classifyFailure({ statusCode: 429, message: 'user-aborted' })).toBe('aborted')
    // 429 status beats an incidental "timeout" word in the message.
    expect(classifyFailure({ statusCode: 429, message: 'timeout while rate limited' })).toBe(
      'rate-limited'
    )
    // 404 status beats a network-ish message.
    expect(classifyFailure({ statusCode: 404, message: 'fetch failed' })).toBe('model-unavailable')
    // Timeout name beats a network message when no status is present.
    expect(classifyFailure({ name: 'AbortError', message: 'fetch failed' })).toBe('timeout')
  })
})

describe('backoffDelayMs', () => {
  it('is exponential in the attempt number with the default base', () => {
    expect(backoffDelayMs(1)).toBe(500)
    expect(backoffDelayMs(2)).toBe(1000)
    expect(backoffDelayMs(3)).toBe(2000)
    expect(backoffDelayMs(4)).toBe(4000)
  })

  it('respects a custom base', () => {
    expect(backoffDelayMs(1, 200)).toBe(200)
    expect(backoffDelayMs(3, 200)).toBe(800)
  })

  it('caps a huge attempt at MAX_BACKOFF_MS', () => {
    expect(backoffDelayMs(100)).toBe(MAX_BACKOFF_MS)
    expect(backoffDelayMs(1000, 1000)).toBe(MAX_BACKOFF_MS)
  })

  it('treats attempts below 1 as 1 (never below base)', () => {
    expect(backoffDelayMs(0)).toBe(500)
    expect(backoffDelayMs(-5, 200)).toBe(200)
  })

  it('is deterministic across repeated calls (no jitter/random)', () => {
    expect(backoffDelayMs(4)).toBe(backoffDelayMs(4))
    expect(backoffDelayMs(4)).toBe(4000)
  })
})

describe('decideRecovery', () => {
  it('backs off and retries a rate-limit while attempts remain', () => {
    expect(decideRecovery('rate-limited', { attempt: 1, maxAttempts: 3 })).toEqual({
      kind: 'retry-after',
      delayMs: 500
    })
    expect(decideRecovery('rate-limited', { attempt: 2, maxAttempts: 3 })).toEqual({
      kind: 'retry-after',
      delayMs: 1000
    })
  })

  it('gives up on a rate-limit once attempts are exhausted', () => {
    expect(decideRecovery('rate-limited', { attempt: 3, maxAttempts: 3 })).toEqual({
      kind: 'give-up',
      reason: 'rate-limit-retries-exhausted'
    })
  })

  it('retries timeout and network immediately while attempts remain', () => {
    expect(decideRecovery('timeout', { attempt: 1, maxAttempts: 3 })).toEqual({ kind: 'retry-now' })
    expect(decideRecovery('network', { attempt: 2, maxAttempts: 3 })).toEqual({ kind: 'retry-now' })
  })

  it('gives up on timeout/network once attempts are exhausted', () => {
    expect(decideRecovery('timeout', { attempt: 3, maxAttempts: 3 })).toEqual({
      kind: 'give-up',
      reason: 'retries-exhausted'
    })
    expect(decideRecovery('network', { attempt: 5, maxAttempts: 5 })).toEqual({
      kind: 'give-up',
      reason: 'retries-exhausted'
    })
  })

  it('prompts a model switch for model-unavailable without blind retry', () => {
    expect(decideRecovery('model-unavailable', { attempt: 1, maxAttempts: 3 })).toEqual({
      kind: 'switch-model'
    })
  })

  it('gives up with user-aborted reason for aborted', () => {
    expect(decideRecovery('aborted', { attempt: 1, maxAttempts: 3 })).toEqual({
      kind: 'give-up',
      reason: 'user-aborted'
    })
  })

  it('allows exactly one immediate retry for unknown then gives up', () => {
    expect(decideRecovery('unknown', { attempt: 1, maxAttempts: 3 })).toEqual({ kind: 'retry-now' })
    expect(decideRecovery('unknown', { attempt: 2, maxAttempts: 3 })).toEqual({
      kind: 'give-up',
      reason: 'unknown-error'
    })
  })

  it('produces a distinct strategy kind per failure kind', () => {
    const state = { attempt: 1, maxAttempts: 3 }
    expect(decideRecovery('rate-limited', state).kind).toBe('retry-after')
    expect(decideRecovery('timeout', state).kind).toBe('retry-now')
    expect(decideRecovery('network', state).kind).toBe('retry-now')
    expect(decideRecovery('model-unavailable', state).kind).toBe('switch-model')
    expect(decideRecovery('aborted', state).kind).toBe('give-up')
  })
})

describe('shouldPreservePartial', () => {
  it('preserves partial output for mid-stream failures', () => {
    expect(shouldPreservePartial('timeout')).toBe(true)
    expect(shouldPreservePartial('network')).toBe(true)
    expect(shouldPreservePartial('aborted')).toBe(true)
    expect(shouldPreservePartial('unknown')).toBe(true)
  })

  it('does not preserve for failures rejected before any token', () => {
    expect(shouldPreservePartial('rate-limited')).toBe(false)
    expect(shouldPreservePartial('model-unavailable')).toBe(false)
  })
})

describe('nextRetryState', () => {
  it('increments the attempt count', () => {
    expect(nextRetryState({ attempt: 1, maxAttempts: 3 })).toEqual({ attempt: 2, maxAttempts: 3 })
  })

  it('clamps the attempt at maxAttempts (never overshoots)', () => {
    expect(nextRetryState({ attempt: 3, maxAttempts: 3 })).toEqual({ attempt: 3, maxAttempts: 3 })
  })
})

describe('purity / determinism', () => {
  it('does not reference Date.now or Math.random in the module source', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../src/shared/retry-policy.ts', import.meta.url), 'utf8')
    expect(src.includes('Date.now')).toBe(false)
    expect(src.includes('Math.random')).toBe(false)
  })

  it('returns identical results for identical inputs', () => {
    const input = { statusCode: 429, message: 'slow down' }
    expect(classifyFailure(input)).toBe(classifyFailure(input))
    const state = { attempt: 2, maxAttempts: 4 }
    expect(decideRecovery('rate-limited', state)).toEqual(decideRecovery('rate-limited', state))
  })
})
