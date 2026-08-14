import { ipcMain } from 'electron'
import { parseAppStatePatch } from './ipc-contracts'

ipcMain.handle('updateAppState', (_event, value) => {
  const _state = parseAppStatePatch(value)
  Object.assign(state, _state)
  if ('ignoreMouse' in _state) applyMousePassthrough(state.ignoreMouse)
  syncAppState()
  return { ...state }
})

export const state = {
  inCoderPage: false,
  ignoreMouse: false
}

export type AppState = typeof state

export function setMousePassthrough(enabled: boolean): void {
  state.ignoreMouse = enabled
  applyMousePassthrough(enabled)
  syncAppState()
}

export function toggleMousePassthrough(): void {
  setMousePassthrough(!state.ignoreMouse)
}

function applyMousePassthrough(enabled: boolean): void {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (enabled) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
  } else {
    mainWindow.setIgnoreMouseEvents(false)
  }
}

function syncAppState(): void {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('sync-app-state', state)
}
