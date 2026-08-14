import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  clampFontSize,
  FONT_SIZE_DEFAULTS,
  FONT_SIZE_MAXIMUMS,
  FONT_SIZE_MINIMUMS
} from '../src/shared/font-size'

describe('font size settings', () => {
  it('keeps UI and answer sizes independent', () => {
    expect(FONT_SIZE_DEFAULTS).toEqual({ ui: 16, answer: 14 })
    expect(FONT_SIZE_MINIMUMS).toEqual({ ui: 9, answer: 8 })
    expect(FONT_SIZE_MAXIMUMS).toEqual({ ui: 20, answer: 22 })
  })

  it('rounds, clamps and recovers invalid values', () => {
    expect(clampFontSize('ui', 17.6)).toBe(18)
    expect(clampFontSize('ui', 100)).toBe(20)
    expect(clampFontSize('answer', 1)).toBe(8)
    expect(clampFontSize('answer', Number.NaN)).toBe(14)
  })

  it('drives rem-based UI text from the root font-size variable', () => {
    const baseCss = readFileSync(resolve(__dirname, '../src/renderer/src/assets/base.css'), 'utf8')
    expect(baseCss).toContain('--ui-font-size: 16px')
    expect(baseCss).toContain('font-size: var(--ui-font-size, 16px)')
  })

  it('applies the independent answer size to every rendered Markdown answer', () => {
    const renderer = readFileSync(
      resolve(__dirname, '../src/renderer/src/components/MarkdownRenderer.tsx'),
      'utf8'
    )
    const mainCss = readFileSync(resolve(__dirname, '../src/renderer/src/assets/main.css'), 'utf8')
    expect(renderer).toContain('workbench-markdown')
    expect(mainCss).toContain('font-size: var(--answer-font-size, 14px)')
  })
})
