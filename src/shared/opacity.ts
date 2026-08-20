export type OpacityTarget = 'overall' | 'window' | 'text' | 'icon'

/** Opacity channels that can be adjusted by the global shortcut bridge. The
 * 0 UI surface lives in renderer settings, so it is intentionally separate
 * from the native window opacity channels above. */
export type AdjustableOpacityTarget = OpacityTarget | 'zeroUiBackground'

export const OPACITY_DEFAULTS: Record<OpacityTarget, number> = {
  overall: 1,
  window: 0.8,
  text: 1,
  icon: 1
}

export const OPACITY_MINIMUMS: Record<OpacityTarget, number> = {
  overall: 0.05,
  window: 0,
  text: 0.05,
  icon: 0
}

export function clampOpacity(target: OpacityTarget, value: number): number {
  const finiteValue = Number.isFinite(value) ? value : OPACITY_DEFAULTS[target]
  return Math.min(1, Math.max(OPACITY_MINIMUMS[target], Math.round(finiteValue * 100) / 100))
}
