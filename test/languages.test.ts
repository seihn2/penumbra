import { describe, expect, it } from 'vitest'
import {
  isSupportedLanguageCode,
  isTranscriptionLanguageCode,
  supportedLanguageCodes,
  transcriptionLanguageCodes,
  transcriptionLanguageHints
} from '../src/shared/languages'

describe('language code guards', () => {
  it('accepts every declared supported code', () => {
    for (const code of supportedLanguageCodes) {
      expect(isSupportedLanguageCode(code)).toBe(true)
    }
  })

  it('rejects unknown supported codes', () => {
    expect(isSupportedLanguageCode('auto')).toBe(false)
    expect(isSupportedLanguageCode('xx')).toBe(false)
  })

  it('rejects the empty string for both guards', () => {
    expect(isSupportedLanguageCode('')).toBe(false)
    expect(isTranscriptionLanguageCode('')).toBe(false)
  })

  it('rejects unknown transcription codes', () => {
    expect(isTranscriptionLanguageCode('xx')).toBe(false)
    expect(isTranscriptionLanguageCode('zh-CN')).toBe(false)
  })

  it('accepts every declared transcription code', () => {
    for (const code of transcriptionLanguageCodes) {
      expect(isTranscriptionLanguageCode(code)).toBe(true)
    }
  })

  it('accepts every supported code as a transcription code too', () => {
    for (const code of supportedLanguageCodes) {
      expect(isTranscriptionLanguageCode(code)).toBe(true)
    }
  })

  it('treats auto as a valid transcription code but not a supported one', () => {
    expect(isTranscriptionLanguageCode('auto')).toBe(true)
    expect(isSupportedLanguageCode('auto')).toBe(false)
  })

  it('supports a Chinese-English transcription preset without adding a translation target', () => {
    expect(isTranscriptionLanguageCode('zh-en')).toBe(true)
    expect(isSupportedLanguageCode('zh-en')).toBe(false)
    expect(transcriptionLanguageHints('zh-en')).toEqual(['zh', 'en'])
  })

  it('maps single-language and automatic choices to provider hints', () => {
    expect(transcriptionLanguageHints('auto')).toEqual([])
    expect(transcriptionLanguageHints('ja')).toEqual(['ja'])
    expect(transcriptionLanguageHints('unknown')).toEqual([])
  })

  it('keeps transcription codes a superset of supported codes', () => {
    for (const code of supportedLanguageCodes) {
      expect(transcriptionLanguageCodes).toContain(code)
    }
    expect(transcriptionLanguageCodes).toContain('auto')
    expect(transcriptionLanguageCodes).toContain('zh-en')
  })
})
