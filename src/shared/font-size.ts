export type FontSizeTarget = 'ui' | 'answer'

export const FONT_SIZE_DEFAULTS: Record<FontSizeTarget, number> = {
  ui: 16,
  answer: 14
}

export const FONT_SIZE_MINIMUMS: Record<FontSizeTarget, number> = {
  ui: 12,
  answer: 12
}

export const FONT_SIZE_MAXIMUMS: Record<FontSizeTarget, number> = {
  ui: 20,
  answer: 22
}

export function clampFontSize(target: FontSizeTarget, value: number): number {
  const finiteValue = Number.isFinite(value) ? value : FONT_SIZE_DEFAULTS[target]
  return Math.min(
    FONT_SIZE_MAXIMUMS[target],
    Math.max(FONT_SIZE_MINIMUMS[target], Math.round(finiteValue))
  )
}
