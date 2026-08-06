import { describe, expect, it } from 'vitest'
import { shouldTranslateText } from '../src/shared/translation-gate'

describe('shouldTranslateText', () => {
  it('skips when source is already the target language', () => {
    expect(shouldTranslateText('你好，请介绍一下你的项目', 'zh')).toBe(false)
    expect(shouldTranslateText('Hello, tell me about your project', 'en')).toBe(false)
    expect(shouldTranslateText('プロジェクトについて教えてください', 'ja')).toBe(false)
    expect(shouldTranslateText('프로젝트에 대해 알려주세요', 'ko')).toBe(false)
  })

  it('translates when source differs from the target', () => {
    expect(shouldTranslateText('你好世界', 'en')).toBe(true)
    expect(shouldTranslateText('Hello world', 'zh')).toBe(true)
    expect(shouldTranslateText('こんにちは', 'zh')).toBe(true)
    expect(shouldTranslateText('안녕하세요', 'en')).toBe(true)
  })

  it('translates Latin-script targets other than en (detected as en, differs)', () => {
    // en/es/fr/de all detect as 'en'; an en line with a fr target must translate.
    expect(shouldTranslateText('Hello there', 'fr')).toBe(true)
    expect(shouldTranslateText('Hello there', 'de')).toBe(true)
    expect(shouldTranslateText('Hello there', 'es')).toBe(true)
  })

  it('translates when the script cannot be identified (conservative)', () => {
    expect(shouldTranslateText('12345 !!!', 'zh')).toBe(true)
    expect(shouldTranslateText('???', 'en')).toBe(true)
  })

  it('returns false for empty / whitespace-only text', () => {
    expect(shouldTranslateText('', 'zh')).toBe(false)
    expect(shouldTranslateText('   ', 'en')).toBe(false)
  })

  it('detects Japanese kana before Han so it is not misread as Chinese', () => {
    // A line mixing kana and kanji is Japanese; with a zh target it should translate.
    expect(shouldTranslateText('今日はいい天気ですね', 'zh')).toBe(true)
    // ...and with a ja target it should be skipped.
    expect(shouldTranslateText('今日はいい天気ですね', 'ja')).toBe(false)
  })
})
