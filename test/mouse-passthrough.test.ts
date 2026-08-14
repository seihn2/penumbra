import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() }
}))

import { setMousePassthrough, state, toggleMousePassthrough } from '../src/main/state'

function installWindow() {
  const window = {
    isDestroyed: () => false,
    setIgnoreMouseEvents: vi.fn(),
    webContents: { send: vi.fn() }
  }
  global.mainWindow = window as never
  return window
}

afterEach(() => {
  state.ignoreMouse = false
  global.mainWindow = undefined
})

describe('mouse passthrough', () => {
  it('applies native click-through and synchronizes renderer state', () => {
    const window = installWindow()

    setMousePassthrough(true)

    expect(state.ignoreMouse).toBe(true)
    expect(window.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true })
    expect(window.webContents.send).toHaveBeenCalledWith('sync-app-state', state)
  })

  it('can always toggle back to an interactive window', () => {
    const window = installWindow()
    state.ignoreMouse = true

    toggleMousePassthrough()

    expect(state.ignoreMouse).toBe(false)
    expect(window.setIgnoreMouseEvents).toHaveBeenCalledWith(false)
  })
})
