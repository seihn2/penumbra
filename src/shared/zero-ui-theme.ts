export const ZERO_UI_BACKDROPS = ['dark', 'light'] as const

export type ZeroUiBackdrop = (typeof ZERO_UI_BACKDROPS)[number]

export const DEFAULT_ZERO_UI_BACKDROP: ZeroUiBackdrop = 'dark'

export function sanitizeZeroUiBackdrop(value: unknown): ZeroUiBackdrop {
  return ZERO_UI_BACKDROPS.includes(value as ZeroUiBackdrop)
    ? (value as ZeroUiBackdrop)
    : DEFAULT_ZERO_UI_BACKDROP
}
