import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyZeroUiWindowAppearance,
  applyTrafficLightMode,
  isCursorInTrafficLightHotZone
} from '../src/main/services/window-appearance'

const originalPlatform = process.platform

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: platform
  })
}

afterEach(() => {
  vi.useRealTimers()
  setPlatform(originalPlatform)
})

describe('macOS traffic-light visibility', () => {
  it('supports always-visible and always-hidden modes', () => {
    setPlatform('darwin')
    const setWindowButtonVisibility = vi.fn()
    const window = {
      isDestroyed: () => false,
      setWindowButtonVisibility
    }

    applyTrafficLightMode(window as never, 'hidden')
    applyTrafficLightMode(window as never, 'always')

    expect(setWindowButtonVisibility).toHaveBeenNthCalledWith(1, false)
    expect(setWindowButtonVisibility).toHaveBeenNthCalledWith(2, true)
  })

  it('shows only while the cursor is in the top-left hot zone', () => {
    vi.useFakeTimers()
    setPlatform('darwin')
    let cursor = { x: 500, y: 500 }
    const setWindowButtonVisibility = vi.fn()
    const window = {
      isDestroyed: () => false,
      isVisible: () => true,
      getBounds: () => ({ x: 100, y: 200, width: 900, height: 670 }),
      setWindowButtonVisibility
    }

    applyTrafficLightMode(window as never, 'hover', () => cursor)
    expect(setWindowButtonVisibility).toHaveBeenLastCalledWith(false)

    cursor = { x: 140, y: 225 }
    vi.advanceTimersByTime(100)
    expect(setWindowButtonVisibility).toHaveBeenLastCalledWith(true)

    cursor = { x: 300, y: 400 }
    vi.advanceTimersByTime(100)
    expect(setWindowButtonVisibility).toHaveBeenLastCalledWith(false)
  })

  it('computes the hover zone relative to the current window bounds', () => {
    const bounds = { x: 100, y: 200, width: 800, height: 600 }
    expect(isCursorInTrafficLightHotZone(bounds, { x: 150, y: 225 })).toBe(true)
    expect(isCursorInTrafficLightHotZone(bounds, { x: 250, y: 225 })).toBe(false)
  })

  it('does nothing outside macOS or after the window is destroyed', () => {
    const setWindowButtonVisibility = vi.fn()
    const window = {
      isDestroyed: () => false,
      setWindowButtonVisibility
    }

    setPlatform('linux')
    applyTrafficLightMode(window as never, 'hidden')

    setPlatform('darwin')
    applyTrafficLightMode({ ...window, isDestroyed: () => true } as never, 'hidden')

    expect(setWindowButtonVisibility).not.toHaveBeenCalled()
  })

  it('reserves header space unless native controls are always hidden', () => {
    for (const file of ['coder/AppHeader.tsx', 'settings/index.tsx', 'help/index.tsx']) {
      const source = readFileSync(resolve(__dirname, `../src/renderer/src/${file}`), 'utf8')
      expect(source).toContain("useSettingValue('trafficLightMode')")
      expect(source).toContain("trafficLightMode !== 'hidden'")
    }
  })

  it('allows an ultra-compact 200 by 120 window', () => {
    const source = readFileSync(resolve(__dirname, '../src/main/main-window.ts'), 'utf8')
    expect(source).toContain('minWidth: 200')
    expect(source).toContain('minHeight: 120')
  })

  it('removes the native shadow in 0 UI mode and restores it afterwards', () => {
    setPlatform('darwin')
    const setHasShadow = vi.fn()
    const window = { isDestroyed: () => false, setHasShadow }

    applyZeroUiWindowAppearance(window as never, true)
    applyZeroUiWindowAppearance(window as never, false)

    expect(setHasShadow).toHaveBeenNthCalledWith(1, false)
    expect(setHasShadow).toHaveBeenNthCalledWith(2, true)
  })
})
