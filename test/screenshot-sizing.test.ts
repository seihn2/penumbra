import { describe, expect, it } from 'vitest'
import {
  fitScreenshotSize,
  MAX_SCREENSHOT_EDGE,
  MAX_SCREENSHOT_PIXELS
} from '../src/shared/screenshot-sizing'

describe('fitScreenshotSize', () => {
  it('keeps ordinary displays at their available pixel density', () => {
    expect(fitScreenshotSize(1280, 720, 1)).toEqual({ width: 1280, height: 720 })
  })

  it('uses Retina detail but caps the payload', () => {
    const size = fitScreenshotSize(1728, 1117, 2)
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(MAX_SCREENSHOT_EDGE)
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_SCREENSHOT_PIXELS)
    expect(size.width / size.height).toBeCloseTo(1728 / 1117, 2)
  })

  it('shrinks a 4K screenshot to the configured edge budget', () => {
    expect(fitScreenshotSize(3840, 2160, 1)).toEqual({ width: 2560, height: 1440 })
  })
})
