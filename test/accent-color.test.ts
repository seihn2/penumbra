import { describe, expect, it } from 'vitest'
import {
  parseHexColor,
  accentVarsFromHex,
  hsvToRgb,
  rgbToHsv,
  rgbToHex,
  hsvToHex,
  hexToHsv,
  normalizeHex
} from '../src/shared/accent-color'

describe('parseHexColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseHexColor('#4aa3df')).toEqual([74, 163, 223])
    expect(parseHexColor('4aa3df')).toEqual([74, 163, 223])
  })

  it('parses 3-digit shorthand', () => {
    expect(parseHexColor('#fff')).toEqual([255, 255, 255])
    expect(parseHexColor('#000')).toEqual([0, 0, 0])
  })

  it('returns null for invalid input', () => {
    expect(parseHexColor('not-a-color')).toBeNull()
    expect(parseHexColor('#12')).toBeNull()
    expect(parseHexColor('')).toBeNull()
  })
})

describe('accentVarsFromHex', () => {
  it('derives solid / soft / border from a hex color', () => {
    const v = accentVarsFromHex('#4aa3df')
    expect(v.accent).toBe('#4aa3df')
    expect(v.accentSoft).toBe('rgba(74, 163, 223, 0.14)')
    expect(v.accentBorder).toBe('rgba(74, 163, 223, 0.35)')
  })

  it('normalizes shorthand to 6-digit solid', () => {
    expect(accentVarsFromHex('#fff').accent).toBe('#ffffff')
  })

  it('falls back to the default accent on bad input', () => {
    const v = accentVarsFromHex('garbage')
    expect(v.accent).toBe('#4aa3df')
    expect(v.accentSoft).toBe('rgba(74, 163, 223, 0.14)')
  })
})

describe('HSV / RGB / hex conversions', () => {
  it('hsvToRgb produces known primaries', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual([255, 0, 0]) // red
    expect(hsvToRgb(120, 1, 1)).toEqual([0, 255, 0]) // green
    expect(hsvToRgb(240, 1, 1)).toEqual([0, 0, 255]) // blue
    expect(hsvToRgb(0, 0, 1)).toEqual([255, 255, 255]) // white
    expect(hsvToRgb(0, 0, 0)).toEqual([0, 0, 0]) // black
  })

  it('rgbToHsv inverts hsvToRgb for primaries', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual([0, 1, 1])
    const [h, s, v] = rgbToHsv(0, 255, 0)
    expect(Math.round(h)).toBe(120)
    expect(s).toBe(1)
    expect(v).toBe(1)
  })

  it('rgbToHex / hsvToHex format correctly', () => {
    expect(rgbToHex(74, 163, 223)).toBe('#4aa3df')
    expect(hsvToHex(0, 1, 1)).toBe('#ff0000')
    expect(rgbToHex(300, -5, 128)).toBe('#ff0080') // clamps out-of-range
  })

  it('hex→hsv→hex round-trips a known accent', () => {
    const hsv = hexToHsv('#4aa3df')!
    expect(hsvToHex(hsv[0], hsv[1], hsv[2])).toBe('#4aa3df')
  })

  it('hexToHsv returns null on bad input', () => {
    expect(hexToHsv('nope')).toBeNull()
  })

  it('normalizeHex cleans accepted forms and rejects junk', () => {
    expect(normalizeHex('4aa3df')).toBe('#4aa3df')
    expect(normalizeHex('#FFF')).toBe('#ffffff')
    expect(normalizeHex('garbage')).toBeNull()
  })
})
