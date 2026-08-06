/** Expand a shortcut accelerator into the set of keys to actually register.

   On Windows, an Alt-based shortcut is also registered with a Ctrl+Alt variant:
   some Alt combos are swallowed by the OS/menus, and Ctrl+Alt is a reliable
   fallback that Electron's globalShortcut can claim. Platform is passed in
   (rather than read from process.platform) so the logic is pure and testable. */
export function getShortcutRegistrationKeys(key: string, platform: NodeJS.Platform): string[] {
  const keys = [key]
  if (platform !== 'win32') return keys

  const parts = key.split('+')
  const hasAlt = parts.includes('Alt')
  const hasCtrl = parts.includes('CommandOrControl') || parts.includes('Control')
  // Only add the Ctrl+Alt alias for pure-Alt combos; if Ctrl is already in the
  // accelerator, the alias would be identical or nonsensical.
  if (hasAlt && !hasCtrl) {
    const aliasParts = [...parts]
    const altIndex = aliasParts.indexOf('Alt')
    if (altIndex >= 0) {
      aliasParts.splice(altIndex, 0, 'CommandOrControl')
      const aliasKey = aliasParts.join('+')
      if (!keys.includes(aliasKey)) keys.push(aliasKey)
    }
  }
  return keys
}
