import { describe, expect, it } from 'vitest'
import { getShortcutRegistrationKeys } from '../src/shared/shortcut-keys'

describe('getShortcutRegistrationKeys', () => {
  it('returns the key unchanged on non-Windows platforms', () => {
    expect(getShortcutRegistrationKeys('Alt+Enter', 'darwin')).toEqual(['Alt+Enter'])
    expect(getShortcutRegistrationKeys('Alt+T', 'linux')).toEqual(['Alt+T'])
  })

  it('adds a Ctrl+Alt alias for pure-Alt combos on Windows', () => {
    expect(getShortcutRegistrationKeys('Alt+Enter', 'win32')).toEqual([
      'Alt+Enter',
      'CommandOrControl+Alt+Enter'
    ])
  })

  it('does not add an alias when Ctrl is already present', () => {
    expect(getShortcutRegistrationKeys('CommandOrControl+Alt+T', 'win32')).toEqual([
      'CommandOrControl+Alt+T'
    ])
    expect(getShortcutRegistrationKeys('Control+Alt+T', 'win32')).toEqual(['Control+Alt+T'])
  })

  it('does not add an alias for non-Alt combos on Windows', () => {
    expect(getShortcutRegistrationKeys('CommandOrControl+Shift+T', 'win32')).toEqual([
      'CommandOrControl+Shift+T'
    ])
  })

  it('inserts the Ctrl modifier before Alt in the alias', () => {
    expect(getShortcutRegistrationKeys('Alt+Shift+Enter', 'win32')).toEqual([
      'Alt+Shift+Enter',
      'CommandOrControl+Alt+Shift+Enter'
    ])
  })
})
