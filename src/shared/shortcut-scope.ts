/** Shortcut scope safety.

   The app registers global (system-wide) shortcuts, which is risky: a
   system-level accelerator can hijack keys that VS Code / browsers / Zoom need,
   and it can fire in the middle of IME (Chinese/Japanese) text composition. This
   module encodes the scope discipline as pure, testable logic:

   - Only a small allow-list of actions may default to system-wide scope.
   - Everything else defaults to window (or leader) scope.
   - System-scope accelerators are checked against a table of accelerators that
     common apps rely on, so we never silently steal Ctrl+C and friends.
   - Business actions are suppressed while an IME composition is active. */

export type ShortcutScope = 'system' | 'window' | 'leader'

/** The only actions allowed to default to a system-wide (global) scope.
   'ignoreOrEnableMouse' is included as an emergency passthrough release, and
   keyboard-first actions remain global so a hidden or click-through app can be
   recovered without touching its window. */
export const SYSTEM_SAFE_ACTIONS: readonly string[] = [
  'hideOrShowMainWindow',
  'takeScreenshot',
  'toggleTranscription',
  'ignoreOrEnableMouse',
  'toggleZeroUiMode',
  'toggleDockIcon',
  'newConversation',
  'focusComposer'
] as const

/** Accelerators that common apps rely on, with the apps that use them. Used to
   warn before a system-scope shortcut steals a key another app needs. */
export const COMMON_APP_SHORTCUTS: { accelerator: string; apps: string[] }[] = [
  { accelerator: 'CommandOrControl+C', apps: ['VS Code', 'Browser', 'Zoom'] },
  { accelerator: 'CommandOrControl+V', apps: ['VS Code', 'Browser', 'Zoom'] },
  { accelerator: 'CommandOrControl+X', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+S', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+Z', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+/', apps: ['VS Code'] },
  { accelerator: 'CommandOrControl+Shift+P', apps: ['VS Code'] },
  { accelerator: 'CommandOrControl+`', apps: ['VS Code'] },
  { accelerator: 'CommandOrControl+W', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+Tab', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+T', apps: ['Browser'] },
  { accelerator: 'CommandOrControl+R', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+F', apps: ['VS Code', 'Browser'] },
  { accelerator: 'CommandOrControl+Shift+A', apps: ['Zoom'] }
]

/** Reason codes for why a system-scope registration is unsafe. */
export type UnsafeReason = 'non-system-action' | 'app-conflict'

export interface SafetyResult {
  ok: boolean
  reason?: UnsafeReason
}

/** Normalize an accelerator so Cmd / Ctrl / Control all collapse to
   'commandorcontrol', modifier order is stable, and case is ignored. */
function normalizeAccelerator(accelerator: string): string {
  const parts = accelerator
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part === 'cmd' || part === 'command' || part === 'ctrl' || part === 'control') {
        return 'commandorcontrol'
      }
      if (part === 'option' || part === 'opt') return 'alt'
      return part
    })

  const modifierOrder = ['commandorcontrol', 'meta', 'alt', 'shift']
  const modifiers = parts
    .filter((part) => modifierOrder.includes(part))
    .sort((a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b))
  const keys = parts.filter((part) => !modifierOrder.includes(part))

  return [...modifiers, ...keys].join('+')
}

/** The default scope for an action: 'system' for the safe allow-list, else
   'window'. */
export function defaultScopeFor(action: string): ShortcutScope {
  return SYSTEM_SAFE_ACTIONS.includes(action) ? 'system' : 'window'
}

/** Apps (if any) that rely on the given accelerator, matched case- and
   Cmd/Ctrl-insensitively. Empty when nothing conflicts. */
export function detectConflicts(accelerator: string): string[] {
  const target = normalizeAccelerator(accelerator)
  const match = COMMON_APP_SHORTCUTS.find(
    (entry) => normalizeAccelerator(entry.accelerator) === target
  )
  return match ? [...match.apps] : []
}

/** Whether binding `action` to `accelerator` at system scope is safe. Fails when
   a non-allow-listed action is registered at system scope, or when the
   accelerator collides with one a common app needs. */
export function isSafeSystemShortcut(action: string, accelerator: string): SafetyResult {
  if (!SYSTEM_SAFE_ACTIONS.includes(action)) {
    return { ok: false, reason: 'non-system-action' }
  }
  if (detectConflicts(accelerator).length > 0) {
    return { ok: false, reason: 'app-conflict' }
  }
  return { ok: true }
}

/** True when an IME composition is active, meaning business actions must be
   suppressed so hotkeys don't fire mid-composition. */
export function shouldSuppressForIme(isComposing: boolean): boolean {
  return isComposing === true
}

/** A safe scope template: assign every action its default scope. */
export function recommendedScopes(actions: string[]): Record<string, ShortcutScope> {
  const result: Record<string, ShortcutScope> = {}
  for (const action of actions) {
    result[action] = defaultScopeFor(action)
  }
  return result
}
