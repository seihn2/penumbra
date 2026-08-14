import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ZERO_UI_BACKDROP,
  ZERO_UI_BACKDROPS,
  sanitizeZeroUiBackdrop
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
})
