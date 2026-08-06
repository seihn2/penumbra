import { describe, expect, it } from 'vitest'
import {
  MOTION_PREFERENCES,
  motionDurationMs,
  resolveReduceMotion,
  type MotionPreference
} from '../src/shared/motion-preference'

describe('resolveReduceMotion', () => {
  it('follows the OS when preference is system', () => {
    expect(resolveReduceMotion('system', true)).toBe(true)
    expect(resolveReduceMotion('system', false)).toBe(false)
  })

  it('forces reduce regardless of the OS', () => {
    expect(resolveReduceMotion('reduce', false)).toBe(true)
    expect(resolveReduceMotion('reduce', true)).toBe(true)
  })

  it('forces full motion even on a reduced-motion OS', () => {
    expect(resolveReduceMotion('full', true)).toBe(false)
    expect(resolveReduceMotion('full', false)).toBe(false)
  })

  it('falls back to the OS signal for an unknown preference', () => {
    expect(resolveReduceMotion('nonsense' as MotionPreference, true)).toBe(true)
    expect(resolveReduceMotion('nonsense' as MotionPreference, false)).toBe(false)
  })

  it('exposes all three preferences in order', () => {
    expect(MOTION_PREFERENCES).toEqual(['system', 'reduce', 'full'])
  })
})

describe('motionDurationMs', () => {
  it('collapses to a non-zero 1ms when reducing', () => {
    expect(motionDurationMs(true, 200)).toBe(1)
  })

  it('keeps the full duration otherwise', () => {
    expect(motionDurationMs(false, 200)).toBe(200)
  })
})
