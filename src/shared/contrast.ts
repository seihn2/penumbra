/** WCAG contrast helpers for the readability / a11y pass (P1#33). Lets the UI
   warn when a chosen accent color would render text at poor contrast against a
   surface. Pure + fully testable; no IO, no clock.

   Reuses parseHexColor from accent-color so hex parsing stays in one place. */

import { parseHexColor } from './accent-color'

/** WCAG AA threshold for normal-size UI text. */
export const AA_NORMAL = 4.5
/** WCAG AA threshold for large text (≥18.66px bold or ≥24px). */
export const AA_LARGE = 3

/** Relative luminance of an sRGB color per WCAG 2.x (0 = black, 1 = white). */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colors (1..21). Returns null when either
   color can't be parsed, so the caller can skip the check rather than guess. */
export function contrastRatio(fgHex: string, bgHex: string): number | null {
  const fg = parseHexColor(fgHex)
  const bg = parseHexColor(bgHex)
  if (!fg || !bg) return null
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export type ContrastRating = 'AAA' | 'AA' | 'AA-large' | 'fail'

/** Rate a contrast ratio against WCAG normal-text thresholds. AAA ≥ 7,
   AA ≥ 4.5, AA-large ≥ 3, otherwise fail. */
export function rateContrast(ratio: number): ContrastRating {
  if (ratio >= 7) return 'AAA'
  if (ratio >= AA_NORMAL) return 'AA'
  if (ratio >= AA_LARGE) return 'AA-large'
  return 'fail'
}

/** Whether a foreground/background pair meets AA for normal text. False (safe)
   when either color is unparseable. */
export function meetsAaNormal(fgHex: string, bgHex: string): boolean {
  const ratio = contrastRatio(fgHex, bgHex)
  return ratio !== null && ratio >= AA_NORMAL
}
