import { describe, expect, it } from 'vitest'
import { sanitizePersistedSettings } from '../src/renderer/src/lib/store/settings'

describe('sanitizePersistedSettings', () => {
  it('returns defaults for null / non-object', () => {
    expect(sanitizePersistedSettings(null).uiLanguage).toBe('zh')
    expect(sanitizePersistedSettings('garbage').opacity).toBe(0.8)
    expect(sanitizePersistedSettings(undefined).apiBaseURL).toBe('')
  })

  it('keeps valid persisted values', () => {
    const out = sanitizePersistedSettings({ apiBaseURL: 'https://x/v1', opacity: 0.5 })
    expect(out.apiBaseURL).toBe('https://x/v1')
    expect(out.opacity).toBe(0.5)
  })

  it('drops values whose type does not match the default', () => {
    const out = sanitizePersistedSettings({ opacity: 'not-a-number', overallOpacity: null })
    expect(out.opacity).toBe(0.8) // fell back to default
    expect(out.overallOpacity).toBe(1)
  })

  it('ignores unknown keys', () => {
    const out = sanitizePersistedSettings({ bogusKey: 123, model: 'gpt-5-mini' })
    expect('bogusKey' in out).toBe(false)
    expect(out.model).toBe('gpt-5-mini')
  })

  it('keeps customModels only when it is an array', () => {
    expect(sanitizePersistedSettings({ customModels: ['a', 'b'] }).customModels).toEqual(['a', 'b'])
    // a non-array object must not slip through (typeof {} === 'object')
    expect(sanitizePersistedSettings({ customModels: { 0: 'x' } }).customModels).toEqual([])
  })

  it('always returns a complete settings object', () => {
    const out = sanitizePersistedSettings({})
    expect(out.uiLanguage).toBe('zh')
    expect(out.asrModel).toBe('qwen-audio-3.0-asr-flash-streaming')
    expect(out.contentProtectionEnabled).toBe(true)
  })
})
