import { screen, type BrowserWindow, type Point, type Rectangle } from 'electron'
import type { TrafficLightMode } from '../../shared/traffic-light-mode'

const TRAFFIC_LIGHT_HOT_ZONE = { width: 92, height: 50 }
const hoverMonitors = new WeakMap<BrowserWindow, ReturnType<typeof setInterval>>()
const currentVisibility = new WeakMap<BrowserWindow, boolean>()

export function applyZeroUiWindowAppearance(window: BrowserWindow, enabled: boolean): void {
  if (process.platform !== 'darwin' || window.isDestroyed()) return
  window.setHasShadow(!enabled)
}

export function isCursorInTrafficLightHotZone(bounds: Rectangle, cursor: Point): boolean {
  const relativeX = cursor.x - bounds.x
  const relativeY = cursor.y - bounds.y
  return (
    relativeX >= 0 &&
    relativeX <= TRAFFIC_LIGHT_HOT_ZONE.width &&
    relativeY >= 0 &&
    relativeY <= TRAFFIC_LIGHT_HOT_ZONE.height
  )
}

export function applyTrafficLightMode(
  window: BrowserWindow,
  mode: TrafficLightMode,
  getCursorPoint: () => Point = () => screen.getCursorScreenPoint()
): void {
  if (process.platform !== 'darwin' || window.isDestroyed()) return
  stopTrafficLightHoverMonitor(window)

  if (mode === 'always') {
    setTrafficLightVisibility(window, true)
    return
  }
  if (mode === 'hidden') {
    setTrafficLightVisibility(window, false)
    return
  }

  const update = (): void => {
    if (window.isDestroyed()) {
      stopTrafficLightHoverMonitor(window)
      return
    }
    const visible =
      window.isVisible() && isCursorInTrafficLightHotZone(window.getBounds(), getCursorPoint())
    setTrafficLightVisibility(window, visible)
  }

  update()
  const monitor = setInterval(update, 100)
  monitor.unref?.()
  hoverMonitors.set(window, monitor)
}

function stopTrafficLightHoverMonitor(window: BrowserWindow): void {
  const monitor = hoverMonitors.get(window)
  if (!monitor) return
  clearInterval(monitor)
  hoverMonitors.delete(window)
}

function setTrafficLightVisibility(window: BrowserWindow, visible: boolean): void {
  if (currentVisibility.get(window) === visible) return
  window.setWindowButtonVisibility(visible)
  currentVisibility.set(window, visible)
}
