import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { isUpgrade } from '../shared/semver'

/** Send an update event to the renderer's in-app (content-protected) update UI.
   We deliberately avoid Electron's native dialog.showMessageBox: a native
   window isn't covered by setContentProtection, so it would appear in a screen
   share and reveal this otherwise-invisible tool. All update prompts live in
   the renderer instead. */
function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = global.mainWindow
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}

// Auto-update is off: no release channel is published yet (the electron-builder
// `publish` owner/repo is still a placeholder). With it on, every launch would
// hit a non-existent releases URL and fail. The whole update pipeline —
// including the in-app content-protected UpdateBanner — stays in place; flip
// this to true (and set a real `publish` target) when releases resume.
const AUTO_UPDATE_ENABLED = false

export function initAutoUpdater(): void {
  if (!AUTO_UPDATE_ENABLED) {
    return
  }
  if (process.platform === 'darwin') {
    return
  }

  try {
    autoUpdater.autoDownload = false

    autoUpdater.on('update-available', (info) => {
      // Only surface a build that is strictly newer than what's installed, so a
      // misconfigured feed or a rollback can never auto-offer a downgrade.
      const offered = info?.version
      if (typeof offered === 'string' && !isUpgrade(app.getVersion(), offered)) {
        console.warn(`Ignoring non-upgrade update ${offered} (current ${app.getVersion()})`)
        return
      }
      sendToRenderer('update-available', { version: offered })
    })

    autoUpdater.on('download-progress', (progress) => {
      sendToRenderer('update-progress', { percent: Math.round(progress?.percent ?? 0) })
    })

    autoUpdater.on('update-downloaded', () => {
      sendToRenderer('update-downloaded')
    })

    autoUpdater.on('error', (error) => {
      console.error('Auto update error:', error)
      sendToRenderer('update-error', {
        message: error instanceof Error ? error.message : String(error)
      })
    })

    autoUpdater.on('update-not-available', () => {
      // no-op
    })

    // Renderer-driven actions (from the in-app update banner).
    ipcMain.handle('download-update', () => {
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('downloadUpdate failed:', err)
        sendToRenderer('update-error', {
          message: err instanceof Error ? err.message : String(err)
        })
      })
    })
    ipcMain.handle('install-update', () => {
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
    })

    autoUpdater.checkForUpdates().catch((err) => console.error(err))
  } catch (e) {
    console.error('Failed to initialize auto-updater:', e)
  }
}
