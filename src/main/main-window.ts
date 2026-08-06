import { join } from 'node:path'
import { shell, BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { settings, applyDockVisibility } from './settings'

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return 1
  return Math.min(1, Math.max(0.1, value))
}

ipcMain.handle('setWindowOpacity', (_event, value: number) => {
  const window = global.mainWindow
  if (!window || window.isDestroyed()) return
  window.setOpacity(clampOpacity(value))
})

export function applyContentProtection(window: BrowserWindow, forceReset = false): void {
  if (!window || window.isDestroyed()) return

  if (forceReset && process.platform === 'win32') {
    window.setContentProtection(false)
  }

  // DIAGNOSTIC: content protection (screen-capture stealth) can render the
  // window invisible to the user on some macOS 26 / GPU configs. Honor a
  // setting so we can confirm whether it's the cause of "window not visible".
  window.setContentProtection(settings.contentProtectionEnabled !== false)
}

export function createWindow(): void {
  // Create the browser window.
  const isMac = process.platform === 'darwin'
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    // Floor the size so resizing the edge can't shrink the window small enough
    // to break the layout. The coach column (≥300px) plus the main content
    // (≥~400px) need room; below this the column gets crushed.
    minWidth: 720,
    minHeight: 420,
    // macOS: keep native traffic lights (close/min/fullscreen) via hidden title
    // bar. Other platforms stay fully frameless with custom controls.
    ...(isMac
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 14, y: 17 } }
      : { frame: false }),
    // Transparent floating window enables the rounded look and mouse
    // passthrough. (The earlier "black window" was a corrupted localStorage
    // state, not transparency — clearing it fixed it.)
    // Transparent floating window so the user can see the coding problem behind
    // it — core to this overlay tool. (The "透明看不见" bug is a renderer mount
    // failure, handled separately; do NOT make this opaque.)
    transparent: true,
    hasShadow: isMac,
    roundedCorners: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Store reference to mainWindow globally
  global.mainWindow = mainWindow

  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('ready-to-show', () => {
    // Guarantee a visible, on-screen, opaque window at startup so a previous
    // session's stray opacity/position can never leave it invisible. The
    // renderer re-applies the user's configured opacity right after.
    mainWindow.setOpacity(1)
    mainWindow.center()
    mainWindow.show()
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
    applyDockVisibility(settings.hideDockIcon)
    applyContentProtection(mainWindow)

    // Reclaim top position when other apps steal it
    mainWindow.on('always-on-top-changed', (_event, isAlwaysOnTop) => {
      if (!isAlwaysOnTop && mainWindow.isVisible() && !mainWindow.isDestroyed()) {
        // Only re-set the flag; avoid moveTop() to not disturb other window focus
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
      }
    })
  })

  mainWindow.on('show', () => {
    applyContentProtection(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
