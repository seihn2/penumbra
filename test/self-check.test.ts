import { describe, expect, it } from 'vitest'
import { aggregateSelfCheck, type CheckResult } from '../src/shared/self-check'

const check = (id: string, status: CheckResult['status'], critical = false): CheckResult => ({
  id,
  status,
  critical
})

describe('aggregateSelfCheck', () => {
  it('is ready when everything that ran passed', () => {
    const v = aggregateSelfCheck([check('ai', 'pass', true), check('screenshot', 'pass', true)])
    expect(v.readiness).toBe('ready')
    expect(v.blockingCheckId).toBeNull()
  })

  it('treats skipped checks as non-blocking (still ready)', () => {
    const v = aggregateSelfCheck([check('ai', 'pass', true), check('asr', 'skip', false)])
    expect(v.readiness).toBe('ready')
  })

  it('is unusable when a critical check fails, blocking on it', () => {
    const v = aggregateSelfCheck([
      check('ai', 'fail', true),
      check('screenshot', 'pass', true),
      check('asr', 'warn', false)
    ])
    expect(v.readiness).toBe('unusable')
    expect(v.blockingCheckId).toBe('ai')
  })

  it('prefers the critical failure over an earlier non-critical warning', () => {
    const v = aggregateSelfCheck([check('asr', 'warn', false), check('ai', 'fail', true)])
    expect(v.readiness).toBe('unusable')
    expect(v.blockingCheckId).toBe('ai')
  })

  it('is degraded when only non-critical checks fail/warn', () => {
    const v = aggregateSelfCheck([
      check('ai', 'pass', true),
      check('screenshot', 'pass', true),
      check('asr', 'fail', false)
    ])
    expect(v.readiness).toBe('degraded')
    expect(v.blockingCheckId).toBe('asr')
  })

  it('surfaces the first degrading check as the thing to fix', () => {
    const v = aggregateSelfCheck([
      check('ai', 'pass', true),
      check('shortcuts', 'warn', false),
      check('asr', 'fail', false)
    ])
    expect(v.readiness).toBe('degraded')
    expect(v.blockingCheckId).toBe('shortcuts')
  })

  it('handles an empty result set as ready', () => {
    expect(aggregateSelfCheck([]).readiness).toBe('ready')
  })
})
