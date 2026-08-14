import { desktopCapturer, screen } from 'electron'
import { settings } from './settings'
import { fitScreenshotSize } from '../shared/screenshot-sizing'

const SCREENSHOT_CAPTURE_ATTEMPTS = 2
const SCREENSHOT_RETRY_DELAY_MS = 120

/** Capture a screenshot of the configured target display (settings
   .screenshotDisplayId), falling back to the primary display when unset or when
   the configured display is no longer attached (e.g. an external monitor was
   unplugged). Returns a base64 PNG, or undefined on failure. */
export async function takeScreenshot(): Promise<string | void> {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return

  const displays = screen.getAllDisplays()
  const configuredId = settings.screenshotDisplayId
  const target =
    (configuredId && displays.find((d) => String(d.id) === String(configuredId))) ||
    screen.getPrimaryDisplay()
  const thumbnailSize = fitScreenshotSize(target.size.width, target.size.height, target.scaleFactor)

  for (let attempt = 1; attempt <= SCREENSHOT_CAPTURE_ATTEMPTS; attempt += 1) {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize,
        fetchWindowIcons: false
      })
      // desktopCapturer sources expose a display_id that matches screen's
      // display ids; pick the source for the target display, else the first.
      const source =
        sources.find((candidate) => String(candidate.display_id) === String(target.id)) ??
        sources[0]
      if (source && !source.thumbnail.isEmpty()) {
        const png = source.thumbnail.toPNG()
        if (png.byteLength > 0) return png.toString('base64')
      }
    } catch (error) {
      if (attempt === SCREENSHOT_CAPTURE_ATTEMPTS) {
        console.error('Error taking screenshot:', error)
      }
    }

    if (attempt < SCREENSHOT_CAPTURE_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, SCREENSHOT_RETRY_DELAY_MS))
    }
  }

  return undefined
}
