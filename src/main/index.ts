import 'dotenv/config'
import { app, BrowserWindow, desktopCapturer, globalShortcut, session, nativeImage } from 'electron'

// Set the app name as early as possible so the Dock tooltip and menu bar show
// "Penumbra" instead of the default "Electron" in dev.
app.setName('Penumbra')

type AbortLikeError = {
  name?: string
  code?: string
  message?: unknown
}

// Swallow AbortError from user-initiated stream cancellations to keep console clean
function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const err = error as AbortLikeError
  const message = typeof err.message === 'string' ? err.message : ''
  return err.name === 'AbortError' || err.code === 'ABORT_ERR' || /aborted/i.test(message)
}

process.on('unhandledRejection', (error) => {
  if (isAbortError(error)) return
  console.error(error)
})

process.on('uncaughtException', (error) => {
  if (isAbortError(error)) return
  console.error(error)
})
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import './shortcuts'
import './transcription'
import './services/soak-sampler'
import './outbound-log'
import './session-cost'
import './profile-auth'
import './project-knowledge-ipc'
import { createWindow } from './main-window'
import { registerDisplayReconciliation } from './services/window-controller'
import { initAutoUpdater } from './auto-updater'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.penumbra.app')

  // macOS: set the Dock icon explicitly (in dev the default Electron icon
  // would otherwise show; packaged builds use the bundled .icns).
  if (process.platform === 'darwin' && app.dock) {
    try {
      const img = nativeImage.createFromPath(icon)
      if (!img.isEmpty()) app.dock.setIcon(img)
    } catch {
      // ignore — non-fatal cosmetic step
    }
  }

  // Auto-approve getDisplayMedia and force system-audio loopback capture, so
  // the renderer's getDisplayMedia({audio:true}) always yields a system-audio
  // track without the user having to pick a source or tick "share audio".
  //
  // A video source MUST be provided: on macOS, loopback audio is only delivered
  // when a screen source accompanies it (audio-only callback fails the capture
  // with AbortError). The video track is stopped immediately on the renderer
  // side. This is also why macOS shows the "is recording your screen"
  // indicator — that's an OS-enforced privacy indicator we can't suppress.
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          if (sources.length > 0) {
            callback({ video: sources[0], audio: 'loopback' })
          } else {
            // No screen source (shouldn't happen once Screen Recording is
            // granted); cancel cleanly so the renderer gets a clear failure
            // instead of a hung promise.
            callback({})
          }
        })
        .catch(() => callback({}))
    },
    { useSystemPicker: false }
  )

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Keep the overlay on a surviving display across monitor hot-plug (P1#32).
  if (global.mainWindow) registerDisplayReconciliation(global.mainWindow)

  // Configure auto-updater
  initAutoUpdater()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (global.mainWindow && !global.mainWindow.isVisible()) {
      global.mainWindow.show()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Unregister all shortcuts when there is no window left
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
