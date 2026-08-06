import { ipcMain } from 'electron'
import { parseAppStatePatch } from './ipc-contracts'

ipcMain.handle('updateAppState', (_event, value) => {
  const _state = parseAppStatePatch(value)
  const mouseChanged = 'ignoreMouse' in _state && _state.ignoreMouse !== state.ignoreMouse
  Object.assign(state, _state)
  // Apply the window-level passthrough side effect when the renderer toggles it
  // (e.g. the status-bar pointer button), mirroring the global-shortcut path.
  if (mouseChanged) {
    const mainWindow = global.mainWindow
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (state.ignoreMouse) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true })
      } else {
        mainWindow.setIgnoreMouseEvents(false)
      }
      mainWindow.webContents.send('sync-app-state', state)
    }
  }
})

export const state = {
  inCoderPage: false,
  ignoreMouse: false
}

export type AppState = typeof state
