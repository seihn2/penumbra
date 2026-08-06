/** Derive the three accent CSS-variable values from a single hex color.
   Mirrors the defaults in base.css: the solid accent, a soft fill at 14%
   alpha, and a border at 35% alpha. Pure + exported for testing. */
export interface AccentVars {
  accent: string
  accentSoft: string
  accentBorder: string
}

/** Parse "#rgb" or "#rrggbb" into [r,g,b]; returns null if unrecognized. */
export function parseHexColor(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(m)) {
    const r = parseInt(m[0] + m[0], 16)
    const g = parseInt(m[1] + m[1], 16)
    const b = parseInt(m[2] + m[2], 16)
    return [r, g, b]
  }
  if (/^[0-9a-fA-F]{6}$/.test(m)) {
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
  }
  return null
}

const DEFAULT_ACCENT = '#4aa3df'

/** Build the accent variable set from a hex color. Falls back to the default
   accent when the input can't be parsed, so a bad value never blanks the UI. */
export function accentVarsFromHex(hex: string): AccentVars {
  const rgb = parseHexColor(hex) ?? parseHexColor(DEFAULT_ACCENT)!
  const [r, g, b] = rgb
  const solid = `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  return {
    accent: solid,
    accentSoft: `rgba(${r}, ${g}, ${b}, 0.14)`,
    accentBorder: `rgba(${r}, ${g}, ${b}, 0.35)`
  }
}

/** HSV (h∈[0,360), s,v∈[0,1]) → [r,g,b] each 0-255. Used by the in-app color
   picker, which can't rely on the OS `<input type=color>` dialog (it fails to
   open on the transparent always-on-top window). */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const hh = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hh >= 0 && hh < 1) [r, g, b] = [c, x, 0]
  else if (hh < 2) [r, g, b] = [x, c, 0]
  else if (hh < 3) [r, g, b] = [0, c, x]
  else if (hh < 4) [r, g, b] = [0, x, c]
  else if (hh < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = v - c
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

/** [r,g,b] each 0-255 → HSV (h∈[0,360), s,v∈[0,1]). */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return [h, s, max]
}

/** [r,g,b] 0-255 → "#rrggbb". */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

/** Convenience: HSV → "#rrggbb". */
export function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}

/** "#rrggbb"/"#rgb" → HSV, or null if unparseable. */
export function hexToHsv(hex: string): [number, number, number] | null {
  const rgb = parseHexColor(hex)
  if (!rgb) return null
  return rgbToHsv(rgb[0], rgb[1], rgb[2])
}

/** Normalize any accepted input into a clean "#rrggbb", or null. Accepts with
   or without leading '#', 3- or 6-digit. */
export function normalizeHex(input: string): string | null {
  const rgb = parseHexColor(input)
  if (!rgb) return null
  return rgbToHex(rgb[0], rgb[1], rgb[2])
}
