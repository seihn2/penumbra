import { describe, expect, it } from 'vitest'
import {
  AA_NORMAL,
  contrastRatio,
  meetsAaNormal,
  rateContrast,
  relativeLuminance
} from '../src/shared/contrast'

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5)
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white (maximum)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('is 1 for identical colors', () => {
    expect(contrastRatio('#4aa3df', '#4aa3df')).toBeCloseTo(1, 5)
  })

  it('is symmetric regardless of argument order', () => {
    const a = contrastRatio('#123456', '#abcdef')
    const b = contrastRatio('#abcdef', '#123456')
    expect(a).toBeCloseTo(b as number, 6)
  })

  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1)
  })

  it('returns null when a color cannot be parsed', () => {
    expect(contrastRatio('nope', '#fff')).toBeNull()
    expect(contrastRatio('#fff', 'nope')).toBeNull()
  })
})

describe('rateContrast', () => {
  it('rates thresholds correctly', () => {
    expect(rateContrast(21)).toBe('AAA')
    expect(rateContrast(7)).toBe('AAA')
    expect(rateContrast(4.5)).toBe('AA')
    expect(rateContrast(3)).toBe('AA-large')
    expect(rateContrast(2.9)).toBe('fail')
    expect(rateContrast(1)).toBe('fail')
  })
})

describe('meetsAaNormal', () => {
  it('passes black on white', () => {
    expect(meetsAaNormal('#000000', '#ffffff')).toBe(true)
  })

  it('fails a low-contrast pair', () => {
    expect(meetsAaNormal('#bbbbbb', '#ffffff')).toBe(false)
  })

  it('is safe (false) when a color is unparseable', () => {
    expect(meetsAaNormal('bad', '#fff')).toBe(false)
  })

  it('uses the AA_NORMAL threshold', () => {
    // A pair right at the threshold passes.
    const ratio = contrastRatio('#767676', '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL)
    expect(meetsAaNormal('#767676', '#ffffff')).toBe(true)
  })
})
