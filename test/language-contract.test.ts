import { describe, expect, it } from 'vitest'
import {
  assistLanguageFor,
  createDefaultContract,
  detectLanguage,
  resolveAnswerLanguage,
  resolveExportLanguage,
  shouldAutoSwitchWithinProblem,
  stableAnswerLanguage,
  type LanguageContract
} from '../src/shared/language-contract'

const contract: LanguageContract = createDefaultContract('zh')

describe('detectLanguage', () => {
  it('detects kana as Japanese (checked before Han)', () => {
    // Mixes kana with Han; must not be misread as Chinese.
    expect(detectLanguage('これはテストです')).toBe('ja')
    expect(detectLanguage('二分探索について説明して')).toBe('ja')
  })

  it('detects hangul as Korean (checked before Han)', () => {
    expect(detectLanguage('이진 탐색을 설명해 주세요')).toBe('ko')
  })

  it('detects Han as Chinese', () => {
    expect(detectLanguage('请解释二分查找')).toBe('zh')
  })

  it('detects Cyrillic as Russian', () => {
    expect(detectLanguage('Объясните бинарный поиск')).toBe('ru')
  })

  it('detects ascii text as English', () => {
    expect(detectLanguage('Explain binary search')).toBe('en')
  })

  it('returns und for empty or whitespace-only input', () => {
    expect(detectLanguage('')).toBe('und')
    expect(detectLanguage('   \n\t ')).toBe('und')
  })

  it('returns und for script-less input', () => {
    expect(detectLanguage('12345 !@#$%')).toBe('und')
  })
})

describe('resolveAnswerLanguage', () => {
  it('follows the question language when answer is follow-question', () => {
    expect(resolveAnswerLanguage(contract, 'Explain binary search')).toBe('en')
    expect(resolveAnswerLanguage(contract, '请解释二分查找')).toBe('zh')
    expect(resolveAnswerLanguage(contract, 'これは何ですか')).toBe('ja')
  })

  it('falls back to the ui language when the question is undetermined', () => {
    expect(resolveAnswerLanguage(contract, '12345')).toBe('zh')
    expect(resolveAnswerLanguage(createDefaultContract('en'), '')).toBe('en')
  })

  it('honors an explicit answer language over the question', () => {
    const fixed: LanguageContract = { ...contract, answer: 'fr' }
    expect(resolveAnswerLanguage(fixed, 'Explain binary search')).toBe('fr')
    expect(resolveAnswerLanguage(fixed, '请解释二分查找')).toBe('fr')
  })
})

describe('stableAnswerLanguage', () => {
  it('keeps the first question language even when a later line differs', () => {
    // First question is English; a later Chinese clarification must not flip it.
    expect(stableAnswerLanguage(contract, 'Explain binary search', '再解释一下边界情况')).toBe('en')
  })

  it('keeps the first question language when the first is Chinese', () => {
    expect(stableAnswerLanguage(contract, '请解释二分查找', 'what about edge cases')).toBe('zh')
  })

  it('never auto-switches within one problem', () => {
    expect(shouldAutoSwitchWithinProblem()).toBe(false)
  })
})

describe('assistLanguageFor', () => {
  it('follows the resolved answer language rather than hardcoding Chinese', () => {
    expect(assistLanguageFor(contract, 'Explain binary search')).toBe('en')
    expect(assistLanguageFor(contract, 'これは何ですか')).toBe('ja')
  })

  it('matches resolveAnswerLanguage exactly', () => {
    const q = 'Describe your last project'
    expect(assistLanguageFor(contract, q)).toBe(resolveAnswerLanguage(contract, q))
  })
})

describe('resolveExportLanguage', () => {
  it('returns the original language when export is original', () => {
    expect(resolveExportLanguage(contract, 'ja')).toBe('ja')
    expect(resolveExportLanguage(contract, 'en')).toBe('en')
  })

  it('honors an explicit export language', () => {
    const fixed: LanguageContract = { ...contract, export: 'zh' }
    expect(resolveExportLanguage(fixed, 'en')).toBe('zh')
  })
})

describe('createDefaultContract', () => {
  it('defaults answer to follow-question and export to original', () => {
    const c = createDefaultContract('zh')
    expect(c.answer).toBe('follow-question')
    expect(c.export).toBe('original')
    expect(c.programming).toBe('typescript')
  })

  it('derives a ui-appropriate translation target', () => {
    expect(createDefaultContract('zh').translationTarget).toBe('en')
    expect(createDefaultContract('en').translationTarget).toBe('zh')
    expect(createDefaultContract('ja').translationTarget).toBe('zh')
  })
})

describe('purity and determinism', () => {
  it('returns the same result for the same inputs', () => {
    expect(detectLanguage('Explain binary search')).toBe(detectLanguage('Explain binary search'))
    expect(resolveAnswerLanguage(contract, '请解释')).toBe(
      resolveAnswerLanguage(contract, '请解释')
    )
  })

  it('does not read Date.now or Math.random from its source', () => {
    // Guard against accidental non-determinism creeping into the pure module.
    const src = fnSource()
    expect(src.includes('Date.now')).toBe(false)
    expect(src.includes('Math.random')).toBe(false)
  })
})

function fnSource(): string {
  return [
    detectLanguage,
    resolveAnswerLanguage,
    resolveExportLanguage,
    shouldAutoSwitchWithinProblem,
    stableAnswerLanguage,
    assistLanguageFor,
    createDefaultContract
  ]
    .map((fn) => fn.toString())
    .join('\n')
}
