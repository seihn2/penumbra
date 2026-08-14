import { app, screen } from 'electron'
import type { BrowserWindow, Rectangle } from 'electron'
import { applyContentProtection } from '../main-window'
import { state } from '../state'
import {
  clampToWorkArea,
  presetRect,
  reconcileWindowToDisplays,
  type SpatialPreset
} from '../../shared/spatial-presets'

const FRONT_REASSERT_DURATION = 8000
const FRONT_REASSERT_INTERVAL = 100
const FRONT_RELATIVE_LEVEL = 100
const BACKGROUND_GUARD_INTERVAL = 2000
const MOVE_STEP = 200

let frontReassertTimer: NodeJS.Timeout | null = null
let backgroundGuardTimer: NodeJS.Timeout | null = null
let isWindowSoftHidden = false
let softHiddenBounds: Rectangle | null = null

function applyTopMost(win: BrowserWindow, aggressive = true) {
  if (!win || win.isDestroyed()) return
  win.setAlwaysOnTop(true, 'screen-saver', FRONT_RELATIVE_LEVEL)
  if (aggressive) win.moveTop()
}

function startBackgroundGuard(window: BrowserWindow) {
  if (backgroundGuardTimer) return
  backgroundGuardTimer = setInterval(() => {
    if (!window || window.isDestroyed() || !window.isVisible()) {
      stopBackgroundGuard()
      return
    }
    applyTopMost(window, false)
  }, BACKGROUND_GUARD_INTERVAL)
}

function stopBackgroundGuard() {
  if (backgroundGuardTimer) {
    clearInterval(backgroundGuardTimer)
    backgroundGuardTimer = null
  }
}

function stopFrontReassert() {
  if (frontReassertTimer) {
    clearInterval(frontReassertTimer)
    frontReassertTimer = null
  }
}

function getOffscreenBounds(window: BrowserWindow): Rectangle {
  const displays = screen.getAllDisplays()
  const maxRight = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width))
  const topMost = Math.min(...displays.map((display) => display.bounds.y))
  const [width, height] = window.getSize()

  return {
    x: maxRight + 2000,
    y: topMost,
    width,
    height
  }
}

function softHideWindow(window: BrowserWindow) {
  if (isWindowSoftHidden || window.isDestroyed()) return

  stopFrontReassert()
  stopBackgroundGuard()
  softHiddenBounds = window.getBounds()
  isWindowSoftHidden = true

  window.setOpacity(0)
  window.setIgnoreMouseEvents(true)
  window.setBounds(getOffscreenBounds(window))
}

function restoreSoftHiddenWindow(window: BrowserWindow) {
  if (!isWindowSoftHidden || !softHiddenBounds || window.isDestroyed()) return

  applyContentProtection(window, true)
  window.setBounds(softHiddenBounds)
  if (state.ignoreMouse) {
    window.setIgnoreMouseEvents(true, { forward: true })
  } else {
    window.setIgnoreMouseEvents(false)
  }
  window.setOpacity(1)

  isWindowSoftHidden = false
  softHiddenBounds = null
  keepWindowInFront(window)
}

function showMainWindow(window: BrowserWindow) {
  if (window.isDestroyed()) return

  if (process.platform === 'darwin' || process.platform === 'win32') {
    window.showInactive()
  } else {
    window.show()
  }
  applyContentProtection(window, true)
  keepWindowInFront(window)
}

export function revealWindowForKeyboardInput(window: BrowserWindow): void {
  if (!window || window.isDestroyed()) return

  if (process.platform === 'win32' && isWindowSoftHidden) {
    restoreSoftHiddenWindow(window)
  } else {
    showMainWindow(window)
  }
  if (process.platform === 'darwin') app.focus({ steal: true })
  window.show()
  window.focus()
}

function keepWindowInFront(window: BrowserWindow) {
  if (!window || window.isDestroyed()) return
  if (frontReassertTimer) {
    clearInterval(frontReassertTimer)
    frontReassertTimer = null
  }

  const start = Date.now()
  const reassert = () => {
    if (!window.isVisible() || window.isDestroyed()) return false
    applyTopMost(window)
    return true
  }

  if (!reassert()) return

  frontReassertTimer = setInterval(() => {
    const shouldStop = Date.now() - start > FRONT_REASSERT_DURATION
    if (shouldStop || !reassert()) {
      if (frontReassertTimer) {
        clearInterval(frontReassertTimer)
        frontReassertTimer = null
      }
    }
  }, FRONT_REASSERT_INTERVAL)

  startBackgroundGuard(window)
}

export function hideOrShowWindow(window: BrowserWindow) {
  if (!window || window.isDestroyed()) return

  if (process.platform === 'win32') {
    if (isWindowSoftHidden) {
      restoreSoftHiddenWindow(window)
      return
    }

    if (!window.isVisible()) {
      showMainWindow(window)
      return
    }

    softHideWindow(window)
    return
  }

  if (window.isVisible()) {
    stopBackgroundGuard()
    window.hide()
  } else {
    showMainWindow(window)
  }
}

export function moveWindowBy(window: BrowserWindow, direction: 'up' | 'down' | 'left' | 'right') {
  if (!window || window.isDestroyed()) return

  const [x, y] = window.getPosition()
  const [width, height] = window.getSize()
  const [nx, ny] = {
    up: [x, y - MOVE_STEP],
    down: [x, y + MOVE_STEP],
    left: [x - MOVE_STEP, y],
    right: [x + MOVE_STEP, y]
  }[direction]

  // Clamp so the window can't be pushed fully off-screen and become
  // unrecoverable (it's invisible to the taskbar and has no reset). Keep at
  // least a margin visible on the display nearest the target position.
  const display = screen.getDisplayNearestPoint({ x: nx, y: ny })
  const clamped = clampToWorkArea({ x: nx, y: ny, width, height }, display.workArea)
  window.setPosition(clamped.x, clamped.y)
}

/** Snap the window to a named spatial preset (corner / half / center) within
   the work area of the display it currently sits on. Halves resize the window;
   corners/center preserve its size. Result is clamped so it stays on-screen. */
export function snapWindowTo(window: BrowserWindow, preset: SpatialPreset) {
  if (!window || window.isDestroyed()) return
  const [x, y] = window.getPosition()
  const [width, height] = window.getSize()
  const display = screen.getDisplayNearestPoint({ x, y })
  const rect = presetRect(preset, { width, height }, display.workArea)
  window.setBounds({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
}

/** Reconcile the window against the current displays: if its home display was
   unplugged (or it otherwise ended up with too little of itself visible), move
   it onto a surviving display so it can't be stranded off-screen. Skipped while
   the window is soft-hidden (it's intentionally parked off-screen then). */
function reconcileWindowDisplays(window: BrowserWindow) {
  if (!window || window.isDestroyed() || isWindowSoftHidden) return
  const bounds = window.getBounds()
  const areas = screen.getAllDisplays().map((d) => d.workArea)
  const { rect, moved } = reconcileWindowToDisplays(bounds, areas)
  if (moved) {
    window.setBounds({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    applyTopMost(window)
  }
}

/** Wire display add/remove/metrics-change events to window reconciliation, so a
   monitor hot-plug never leaves the overlay stranded on a gone display (P1#32).
   Returns a disposer that unregisters the listeners. */
export function registerDisplayReconciliation(window: BrowserWindow): () => void {
  const handler = (): void => reconcileWindowDisplays(window)
  screen.on('display-removed', handler)
  screen.on('display-added', handler)
  screen.on('display-metrics-changed', handler)
  return () => {
    screen.removeListener('display-removed', handler)
    screen.removeListener('display-added', handler)
    screen.removeListener('display-metrics-changed', handler)
  }
}
