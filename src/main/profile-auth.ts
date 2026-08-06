import { ipcMain } from 'electron'
import { settings } from './settings'

/** Profile-use session gate (P0#11): a one-tap "don't use my profile this
   session" control. When disabled, userMemory is withheld from AI prompts even
   though it remains saved locally — enforcing that "saved locally" and "sent to
   the model" are separate. */
let profileSessionEnabled = true

/** The memory text to include in prompts: the saved userMemory when the profile
   is enabled this session, or '' when the user has disabled it. */
export function memoryForSending(): string {
  return profileSessionEnabled ? (settings.userMemory?.trim() ?? '') : ''
}

export function isProfileSessionEnabled(): boolean {
  return profileSessionEnabled
}

ipcMain.handle('set-profile-session-enabled', (_event, enabled: unknown) => {
  profileSessionEnabled = enabled !== false
  return profileSessionEnabled
})

ipcMain.handle('get-profile-session-enabled', () => profileSessionEnabled)
