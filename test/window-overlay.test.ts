import { afterEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  setActivationPolicy: vi.fn(),
  dockHide: vi.fn(),
  dockShow: vi.fn(() => Promise.resolve())
}))

vi.mock('electron', () => ({
  app: {
    setActivationPolicy: electronMocks.setActivationPolicy,
    dock: { hide: electronMocks.dockHide, show: electronMocks.dockShow }
  }
}))

import {
  applyOverlayWindowBehavior,
  initializeOverlayApplication,
  reassertOverlayWindowBehavior,
  setOverlayDockVisibility,
  showOverlayWindow
} from '../src/main/services/window-overlay'

const originalPlatform = process.platform

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { configurable: true, value: platform })
}

function createWindow() {
  return {
    isDestroyed: () => false,
    setFullScreenable: vi.fn(),
    setHiddenInMissionControl: vi.fn(),
    setVisibleOnAllWorkspaces: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    showInactive: vi.fn(),
    show: vi.fn(),
    moveTop: vi.fn()
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  setPlatform(originalPlatform)
})

describe('fullscreen overlay window behavior', () => {
  it('starts as an accessory app so fullscreen binding does not switch Spaces', () => {
    setPlatform('darwin')

    initializeOverlayApplication()

    expect(electronMocks.setActivationPolicy).toHaveBeenCalledWith('accessory')
  })

  it('joins every macOS Space while staying above fullscreen apps', () => {
    setPlatform('darwin')
    initializeOverlayApplication()
    const window = createWindow()

    applyOverlayWindowBehavior(window as never)

    expect(window.setFullScreenable).toHaveBeenCalledWith(false)
    expect(window.setHiddenInMissionControl).toHaveBeenCalledWith(true)
    expect(window.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver', 100)
  })

  it('changes activation policy with Dock visibility and rebinds once', () => {
    vi.useFakeTimers()
    setPlatform('darwin')
    const window = createWindow()

    setOverlayDockVisibility(false, window as never)
    vi.runAllTimers()

    expect(electronMocks.setActivationPolicy).toHaveBeenCalledWith('regular')
    expect(electronMocks.dockShow).toHaveBeenCalledOnce()
    expect(window.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true
    })
  })

  it('reasserts only the window level without retransformation', () => {
    vi.useFakeTimers()
    setPlatform('darwin')
    const window = createWindow()

    reassertOverlayWindowBehavior(window as never)
    vi.runAllTimers()

    expect(window.setAlwaysOnTop).toHaveBeenCalledTimes(3)
    expect(window.setVisibleOnAllWorkspaces).not.toHaveBeenCalled()
  })

  it('shows inactive on macOS without leaving the current fullscreen Space', () => {
    setPlatform('darwin')
    const window = createWindow()

    showOverlayWindow(window as never)

    expect(window.showInactive).toHaveBeenCalledOnce()
    expect(window.show).not.toHaveBeenCalled()
    expect(window.moveTop).toHaveBeenCalledOnce()
    expect(window.setVisibleOnAllWorkspaces).not.toHaveBeenCalled()
  })
})
