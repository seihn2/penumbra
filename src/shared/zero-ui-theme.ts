import { normalizeHex } from './accent-color'

export const ZERO_UI_BACKDROPS = ['dark', 'light'] as const

export type ZeroUiBackdrop = (typeof ZERO_UI_BACKDROPS)[number]

export const DEFAULT_ZERO_UI_BACKDROP: ZeroUiBackdrop = 'dark'

export interface ZeroUiPalette {
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
}

export const ZERO_UI_PALETTE_DEFAULTS: Record<ZeroUiBackdrop, ZeroUiPalette> = {
  dark: {
    textColor: '#f4f7fa',
    backgroundColor: '#03070c',
    backgroundOpacity: 0.18
  },
  light: {
    textColor: '#111820',
    backgroundColor: '#ffffff',
    backgroundOpacity: 0.28
  }
}

export const DEFAULT_ZERO_UI_BORDER_VISIBLE = false

export function sanitizeZeroUiBackdrop(value: unknown): ZeroUiBackdrop {
  return ZERO_UI_BACKDROPS.includes(value as ZeroUiBackdrop)
    ? (value as ZeroUiBackdrop)
    : DEFAULT_ZERO_UI_BACKDROP
}

export function sanitizeZeroUiColor(value: unknown, fallback: string): string {
  return typeof value === 'string' ? (normalizeHex(value) ?? fallback) : fallback
}

export function clampZeroUiBackgroundOpacity(value: unknown, fallback = 0): number {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(1, Math.max(0, Math.round(finiteValue * 100) / 100))
}
