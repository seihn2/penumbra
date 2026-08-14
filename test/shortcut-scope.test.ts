import { describe, expect, it } from 'vitest'
import {
  COMMON_APP_SHORTCUTS,
  SYSTEM_SAFE_ACTIONS,
  defaultScopeFor,
  detectConflicts,
  isSafeSystemShortcut,
  recommendedScopes,
  shouldSuppressForIme
} from '../src/shared/shortcut-scope'

describe('defaultScopeFor', () => {
  it('returns system for exactly the seven safe actions', () => {
    expect(defaultScopeFor('hideOrShowMainWindow')).toBe('system')
    expect(defaultScopeFor('takeScreenshot')).toBe('system')
    expect(defaultScopeFor('toggleTranscription')).toBe('system')
    expect(defaultScopeFor('ignoreOrEnableMouse')).toBe('system')
    expect(defaultScopeFor('toggleDockIcon')).toBe('system')
    expect(defaultScopeFor('newConversation')).toBe('system')
    expect(defaultScopeFor('focusComposer')).toBe('system')
  })

  it('returns window for scrolling / copy / movement / opacity actions', () => {
    expect(defaultScopeFor('pageUp')).toBe('window')
    expect(defaultScopeFor('pageDown')).toBe('window')
    expect(defaultScopeFor('copyLatestAnswer')).toBe('window')
    expect(defaultScopeFor('moveMainWindowUp')).toBe('window')
    expect(defaultScopeFor('increaseOverallOpacity')).toBe('window')
    expect(defaultScopeFor('increaseIconOpacity')).toBe('window')
    expect(defaultScopeFor('someUnknownAction')).toBe('window')
  })

  it('exposes exactly seven system-safe actions', () => {
    expect(SYSTEM_SAFE_ACTIONS.length).toBe(7)
  })
})

describe('detectConflicts', () => {
  it('flags Ctrl/Cmd+C as used by VS Code and Browser', () => {
    const apps = detectConflicts('CommandOrControl+C')
    expect(apps).toContain('VS Code')
    expect(apps).toContain('Browser')
  })

  it('returns an empty list for an obscure combo', () => {
    expect(detectConflicts('CommandOrControl+Alt+9')).toEqual([])
  })

  it('normalizes Cmd, Ctrl, and CommandOrControl to the same conflict', () => {
    const cmd = detectConflicts('Cmd+C')
    const ctrl = detectConflicts('Ctrl+C')
    const cmdOrCtrl = detectConflicts('CommandOrControl+C')
    expect(cmd).toEqual(cmdOrCtrl)
    expect(ctrl).toEqual(cmdOrCtrl)
  })

  it('is case-insensitive and modifier-order-insensitive', () => {
    expect(detectConflicts('shift+commandorcontrol+p')).toContain('VS Code')
  })

  it('returns a fresh array (no shared mutable reference)', () => {
    const first = detectConflicts('CommandOrControl+C')
    first.push('Mutated')
    expect(detectConflicts('CommandOrControl+C')).not.toContain('Mutated')
  })
})

describe('isSafeSystemShortcut', () => {
  it('rejects a window-only action at system scope with reason non-system-action', () => {
    expect(isSafeSystemShortcut('pageUp', 'Alt+PageUp')).toEqual({
      ok: false,
      reason: 'non-system-action'
    })
  })

  it('rejects a safe action bound to Ctrl+C with reason app-conflict', () => {
    expect(isSafeSystemShortcut('takeScreenshot', 'Ctrl+C')).toEqual({
      ok: false,
      reason: 'app-conflict'
    })
  })

  it('accepts a safe action on an obscure combo', () => {
    expect(isSafeSystemShortcut('takeScreenshot', 'CommandOrControl+Alt+9')).toEqual({ ok: true })
  })

  it('prefers non-system-action over app-conflict when both apply', () => {
    expect(isSafeSystemShortcut('copyLatestAnswer', 'CommandOrControl+C')).toEqual({
      ok: false,
      reason: 'non-system-action'
    })
  })
})

describe('shouldSuppressForIme', () => {
  it('suppresses while composition is active', () => {
    expect(shouldSuppressForIme(true)).toBe(true)
  })

  it('does not suppress when composition is inactive', () => {
    expect(shouldSuppressForIme(false)).toBe(false)
  })
})

describe('recommendedScopes', () => {
  it('assigns each action its default scope', () => {
    const scopes = recommendedScopes(['takeScreenshot', 'pageUp', 'moveMainWindowUp'])
    expect(scopes).toEqual({
      takeScreenshot: 'system',
      pageUp: 'window',
      moveMainWindowUp: 'window'
    })
  })

  it('returns an empty template for no actions', () => {
    expect(recommendedScopes([])).toEqual({})
  })
})

describe('purity and determinism', () => {
  it('returns identical results across repeated calls', () => {
    expect(detectConflicts('Cmd+S')).toEqual(detectConflicts('Cmd+S'))
    expect(defaultScopeFor('takeScreenshot')).toBe(defaultScopeFor('takeScreenshot'))
  })

  it('has a non-empty common-app table', () => {
    expect(COMMON_APP_SHORTCUTS.length).toBeGreaterThan(0)
  })
})
