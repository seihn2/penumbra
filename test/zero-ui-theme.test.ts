import { describe, expect, it } from 'vitest'
import {
  clampZeroUiBackgroundOpacity,
  DEFAULT_ZERO_UI_BORDER_VISIBLE,
  DEFAULT_ZERO_UI_BACKDROP,
  ZERO_UI_PALETTE_DEFAULTS,
  ZERO_UI_BACKDROPS,
  sanitizeZeroUiBackdrop,
  sanitizeZeroUiColor
} from '../src/shared/zero-ui-theme'

describe('0 UI backdrop theme', () => {
  it('supports separate dark and light underlying content', () => {
    expect(ZERO_UI_BACKDROPS).toEqual(['dark', 'light'])
    expect(DEFAULT_ZERO_UI_BACKDROP).toBe('dark')
  })

  it('keeps valid choices and recovers invalid persisted values', () => {
    expect(sanitizeZeroUiBackdrop('light')).toBe('light')
    expect(sanitizeZeroUiBackdrop('dark')).toBe('dark')
    expect(sanitizeZeroUiBackdrop('auto')).toBe('dark')
    expect(sanitizeZeroUiBackdrop(null)).toBe('dark')
  })

  it('keeps independent customizable palettes for both backdrop profiles', () => {
    expect(ZERO_UI_PALETTE_DEFAULTS.dark).toEqual({
      textColor: '#f4f7fa',
      backgroundColor: '#03070c',
      backgroundOpacity: 0.18
    })
    expect(ZERO_UI_PALETTE_DEFAULTS.light).toEqual({
      textColor: '#111820',
      backgroundColor: '#ffffff',
      backgroundOpacity: 0.28
    })
    expect(DEFAULT_ZERO_UI_BORDER_VISIBLE).toBe(false)
  })

  it('normalizes custom colors and safely clamps fine-grained surface opacity', () => {
    expect(sanitizeZeroUiColor('#abc', '#000000')).toBe('#aabbcc')
    expect(sanitizeZeroUiColor('not-a-color', '#123456')).toBe('#123456')
    expect(clampZeroUiBackgroundOpacity(0.123)).toBe(0.12)
    expect(clampZeroUiBackgroundOpacity(-1)).toBe(0)
    expect(clampZeroUiBackgroundOpacity(2)).toBe(1)
    expect(clampZeroUiBackgroundOpacity(Number.NaN, 0.28)).toBe(0.28)
  })
})
