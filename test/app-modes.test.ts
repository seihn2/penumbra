import { describe, expect, it } from 'vitest'
import {
  APP_MODES,
  DEFAULT_APP_MODE,
  GENERAL_SYSTEM_PROMPT,
  isAppMode
} from '../src/shared/app-modes'

describe('APP_MODES', () => {
  it('contains exactly the two known modes', () => {
    expect(APP_MODES).toEqual(['algorithm', 'general'])
  })
})

describe('DEFAULT_APP_MODE', () => {
  it('is a valid app mode', () => {
    expect(isAppMode(DEFAULT_APP_MODE)).toBe(true)
  })

  it('defaults to algorithm', () => {
    expect(DEFAULT_APP_MODE).toBe('algorithm')
  })
})

describe('GENERAL_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof GENERAL_SYSTEM_PROMPT).toBe('string')
    expect(GENERAL_SYSTEM_PROMPT.trim().length).toBeGreaterThan(0)
  })
})

describe('isAppMode', () => {
  it('accepts algorithm and general', () => {
    expect(isAppMode('algorithm')).toBe(true)
    expect(isAppMode('general')).toBe(true)
  })

  it('rejects unknown strings', () => {
    expect(isAppMode('coding')).toBe(false)
    expect(isAppMode('')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isAppMode(undefined)).toBe(false)
    expect(isAppMode(null)).toBe(false)
    expect(isAppMode(1)).toBe(false)
    expect(isAppMode({})).toBe(false)
  })
})
