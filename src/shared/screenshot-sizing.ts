export const MAX_SCREENSHOT_EDGE = 2560
export const MAX_SCREENSHOT_PIXELS = 4_000_000

export interface ScreenshotSize {
  width: number
  height: number
}

export function fitScreenshotSize(width: number, height: number, scaleFactor = 1): ScreenshotSize {
  const sourceWidth = Math.max(1, Math.round(width * Math.max(1, scaleFactor)))
  const sourceHeight = Math.max(1, Math.round(height * Math.max(1, scaleFactor)))
  const edgeScale = Math.min(1, MAX_SCREENSHOT_EDGE / Math.max(sourceWidth, sourceHeight))
  const pixelScale = Math.min(1, Math.sqrt(MAX_SCREENSHOT_PIXELS / (sourceWidth * sourceHeight)))
  const scale = Math.min(edgeScale, pixelScale)

  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale))
  }
}
