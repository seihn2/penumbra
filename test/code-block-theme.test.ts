import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CODE_BLOCK_THEME, sanitizeCodeBlockTheme } from '../src/shared/code-block-theme'

describe('code block theme', () => {
  it('defaults invalid values to the discreet soft theme', () => {
    expect(DEFAULT_CODE_BLOCK_THEME).toBe('soft')
    expect(sanitizeCodeBlockTheme('dark')).toBe('dark')
    expect(sanitizeCodeBlockTheme('neon')).toBe('soft')
  })

  it('uses app-owned syntax colors instead of a forced dark stylesheet', () => {
    const renderer = readFileSync(
      resolve(__dirname, '../src/renderer/src/components/MarkdownRenderer.tsx'),
      'utf8'
    )
    const css = readFileSync(resolve(__dirname, '../src/renderer/src/assets/main.css'), 'utf8')

    expect(renderer).not.toContain('github-dark.css')
    expect(css).toContain("html[data-code-theme='light']")
    expect(css).toContain("html[data-code-theme='dark']")
    expect(css).toContain("html[data-code-theme='soft']")
  })
})
