import { desktopCapturer, screen } from 'electron'
import { settings } from './settings'

/** Capture a screenshot of the configured target display (settings
   .screenshotDisplayId), falling back to the primary display when unset or when
   the configured display is no longer attached (e.g. an external monitor was
   unplugged). Returns a base64 PNG, or undefined on failure. */
export function takeScreenshot(): Promise<string | void> {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return Promise.resolve()

  const displays = screen.getAllDisplays()
  const configuredId = settings.screenshotDisplayId
  const target =
    (configuredId && displays.find((d) => String(d.id) === String(configuredId))) ||
    screen.getPrimaryDisplay()
  const { width, height } = target.size

  return desktopCapturer
    .getSources({ types: ['screen'], thumbnailSize: { width, height } })
    .then((sources) => {
      if (sources.length === 0) return undefined
      // desktopCapturer sources expose a display_id that matches screen's
      // display ids; pick the source for the target display, else the first.
      const source = sources.find((s) => String(s.display_id) === String(target.id)) ?? sources[0]
      return source.thumbnail.toPNG().toString('base64')
    })
    .catch((error) => {
      console.error('Error taking screenshot:', error)
    })
}
