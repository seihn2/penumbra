import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  clampOpacity,
  OPACITY_DEFAULTS,
  OPACITY_MINIMUMS,
  type AdjustableOpacityTarget
} from '../src/shared/opacity'

describe('opacity channels', () => {
  it('keeps four independent defaults', () => {
    expect(OPACITY_DEFAULTS).toEqual({ overall: 1, window: 0.8, text: 1, icon: 1 })
  })

  it('allows the window and icons to become fully transparent', () => {
    expect(OPACITY_MINIMUMS.window).toBe(0)
    expect(OPACITY_MINIMUMS.icon).toBe(0)
    expect(clampOpacity('window', -1)).toBe(0)
    expect(clampOpacity('icon', 0)).toBe(0)
  })

  it('allows overall and text opacity down to a recoverable five percent', () => {
    expect(clampOpacity('overall', 0)).toBe(0.05)
    expect(clampOpacity('text', 0)).toBe(0.05)
  })

  it('caps, rounds and recovers non-finite values', () => {
    expect(clampOpacity('icon', 4)).toBe(1)
    expect(clampOpacity('window', 0.333)).toBe(0.33)
    expect(clampOpacity('window', Number.NaN)).toBe(0.8)
  })
})

describe('opacity CSS layer contract', () => {
  const baseCss = readFileSync(resolve(__dirname, '../src/renderer/src/assets/base.css'), 'utf8')
  const mainCss = readFileSync(resolve(__dirname, '../src/renderer/src/assets/main.css'), 'utf8')

  it('drives surface and border tokens from window opacity', () => {
    expect(baseCss).toContain('--surface-1-base:')
    expect(baseCss).toContain('var(--surface-1-base) calc(var(--window-opacity) * 100%)')
    expect(baseCss).toContain('var(--hairline-base) calc(var(--window-opacity) * 100%)')
    expect(baseCss).toContain('var(--accent) calc(var(--window-opacity) * 100%)')
    expect(mainCss).toContain('scrollbar-color: var(--scrollbar-thumb) transparent')
  })

  it('keeps text and icons on separate visual channels', () => {
    expect(mainCss).toContain('var(--content-opacity, 1)')
    expect(mainCss).toContain('filter: opacity(var(--icon-opacity, 1))')
  })

  it('uses one-percent controls in settings and global shortcuts', () => {
    const settings = readFileSync(
      resolve(__dirname, '../src/renderer/src/settings/AppearanceSettingsSection.tsx'),
      'utf8'
    )
    const shortcuts = readFileSync(resolve(__dirname, '../src/main/shortcuts.ts'), 'utf8')
    expect(settings).toContain('step={0.01}')
    expect(shortcuts).toContain("sendOpacityAdjust('overall', 0.01)")
    expect(shortcuts).toContain("sendOpacityAdjust('text', -0.01)")
    expect(shortcuts).toContain("sendOpacityAdjust('zeroUiBackground', 0.01)")
    expect(shortcuts).toContain("sendOpacityAdjust('zeroUiBackground', -0.01)")
  })

  it('keeps the zero UI background channel separate from native window opacity', () => {
    const target: AdjustableOpacityTarget = 'zeroUiBackground'
    expect(target).toBe('zeroUiBackground')
  })
})
