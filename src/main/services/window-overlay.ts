import { app } from 'electron'
import type { BrowserWindow } from 'electron'

const OVERLAY_RELATIVE_LEVEL = 100
const LEVEL_REASSERT_DELAYS = [0, 120, 500] as const
let macAccessoryMode = false
let workspaceConfigureToken = 0

export function initializeOverlayApplication(): void {
  if (process.platform !== 'darwin') return
  app.setActivationPolicy('accessory')
  macAccessoryMode = true
}

export function configureOverlayWindowForSpaces(window: BrowserWindow): void {
  if (!window || window.isDestroyed() || process.platform !== 'darwin') return

  window.setFullScreenable(false)
  window.setHiddenInMissionControl(true)
  window.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    ...(macAccessoryMode ? { skipTransformProcessType: true } : {})
  })
}

export function applyOverlayWindowLevel(window: BrowserWindow): void {
  if (!window || window.isDestroyed()) return
  window.setAlwaysOnTop(true, 'screen-saver', OVERLAY_RELATIVE_LEVEL)
}

export function applyOverlayWindowBehavior(window: BrowserWindow): void {
  configureOverlayWindowForSpaces(window)
  applyOverlayWindowLevel(window)
}

export function reassertOverlayWindowBehavior(window: BrowserWindow): void {
  for (const delay of LEVEL_REASSERT_DELAYS) {
    setTimeout(() => applyOverlayWindowLevel(window), delay)
  }
}

export function setOverlayDockVisibility(hidden: boolean, window?: BrowserWindow): void {
  if (process.platform !== 'darwin') return

  macAccessoryMode = hidden
  app.setActivationPolicy(hidden ? 'accessory' : 'regular')
  if (hidden) {
    app.dock?.hide()
  } else {
    void app.dock?.show()
  }

  if (!window || window.isDestroyed()) return
  const token = ++workspaceConfigureToken
  setTimeout(
    () => {
      if (token !== workspaceConfigureToken || window.isDestroyed()) return
      configureOverlayWindowForSpaces(window)
      applyOverlayWindowLevel(window)
    },
    hidden ? 0 : 180
  )
}

export function showOverlayWindow(window: BrowserWindow): void {
  if (!window || window.isDestroyed()) return

  applyOverlayWindowLevel(window)
  if (process.platform === 'darwin' || process.platform === 'win32') {
    window.showInactive()
  } else {
    window.show()
  }
  applyOverlayWindowLevel(window)
  window.moveTop()
  reassertOverlayWindowBehavior(window)
}
