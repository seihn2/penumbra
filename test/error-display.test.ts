import { describe, expect, it } from 'vitest'
import { formatErrorForDisplay } from '../src/shared/error-display'

describe('renderer error display', () => {
  it('keeps short errors readable', () => {
    expect(formatErrorForDisplay(new TypeError('failed to render'))).toBe(
      'TypeError: failed to render'
    )
  })

  it('collapses whitespace and truncates bundled source dumps', () => {
    const bundledSource = 'return result || { type: "root" };\n'.repeat(100)
    const summary = formatErrorForDisplay(new Error(bundledSource), 80)

    expect(summary.length).toBeLessThanOrEqual(80)
    expect(summary).not.toContain('\n')
    expect(summary.endsWith('…')).toBe(true)
  })
})
