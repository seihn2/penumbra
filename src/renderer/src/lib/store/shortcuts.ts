import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { isMac, platformAlt } from '../utils/env'

export type Shortcut = {
  action: string
  key: string
  defaultKey: string
  category: string
  status?: ShortcutStatus
}

export enum ShortcutStatus {
  Registered = 'registered',
  Failed = 'failed',
  /** Shortcut is available to register but not registered. */
  Available = 'available'
}

interface ShortcutsState {
  shortcuts: Record<string, Shortcut>
}

interface ShortcutsStore extends ShortcutsState {
  updateShortcut: (action: string, shortcut: Shortcut) => void
  updateShortcuts: (shortcuts: Record<string, Shortcut>) => void
  setStatuses: (statuses: { action: string; status: string }[]) => void
  resetShortcuts: () => void
}

type PersistedShortcutsState = {
  shortcuts?: Record<string, Shortcut>
}

function isPersistedShortcutsState(value: unknown): value is PersistedShortcutsState {
  return typeof value === 'object' && value !== null && 'shortcuts' in value
}

const defaultShortcuts: Record<string, Omit<Shortcut, 'defaultKey'>> = {
  hideOrShowMainWindow: {
    action: 'hideOrShowMainWindow',
    key: `${platformAlt}+H`,
    category: 'Window Management'
  },
  resetWindow: {
    action: 'resetWindow',
    key: `${platformAlt}+0`,
    category: 'Window Management'
  },
  ignoreOrEnableMouse: {
    action: 'ignoreOrEnableMouse',
    key: `${platformAlt}+M`,
    category: 'Window Management'
  },
  newConversation: {
    action: 'newConversation',
    key: `${platformAlt}+Shift+N`,
    category: 'Window Management'
  },
  focusComposer: {
    action: 'focusComposer',
    key: `${platformAlt}+I`,
    category: 'Window Management'
  },
  toggleContentProtection: {
    action: 'toggleContentProtection',
    key: `${platformAlt}+Shift+S`,
    category: 'Window Management'
  },
  toggleZeroUiMode: {
    action: 'toggleZeroUiMode',
    key: `${platformAlt}+Shift+H`,
    category: 'Window Management'
  },
  ...(isMac
    ? {
        toggleDockIcon: {
          action: 'toggleDockIcon',
          key: `${platformAlt}+Shift+D`,
          category: 'Window Management'
        }
      }
    : {}),
  increaseOverallOpacity: {
    action: 'increaseOverallOpacity',
    key: `${platformAlt}+=`,
    category: 'Window Management'
  },
  decreaseOverallOpacity: {
    action: 'decreaseOverallOpacity',
    key: `${platformAlt}+-`,
    category: 'Window Management'
  },
  increaseWindowOpacity: {
    action: 'increaseWindowOpacity',
    key: `${platformAlt}+]`,
    category: 'Window Management'
  },
  decreaseWindowOpacity: {
    action: 'decreaseWindowOpacity',
    key: `${platformAlt}+[`,
    category: 'Window Management'
  },
  increaseTextOpacity: {
    action: 'increaseTextOpacity',
    key: `${platformAlt}+Shift+]`,
    category: 'Window Management'
  },
  decreaseTextOpacity: {
    action: 'decreaseTextOpacity',
    key: `${platformAlt}+Shift+[`,
    category: 'Window Management'
  },
  increaseIconOpacity: {
    action: 'increaseIconOpacity',
    key: `${platformAlt}+Shift+=`,
    category: 'Window Management'
  },
  decreaseIconOpacity: {
    action: 'decreaseIconOpacity',
    key: `${platformAlt}+Shift+-`,
    category: 'Window Management'
  },
  increaseZeroUiBackgroundOpacity: {
    action: 'increaseZeroUiBackgroundOpacity',
    key: `${platformAlt}+Shift+Up`,
    category: 'Window Management'
  },
  decreaseZeroUiBackgroundOpacity: {
    action: 'decreaseZeroUiBackgroundOpacity',
    key: `${platformAlt}+Shift+Down`,
    category: 'Window Management'
  },
  takeScreenshot: {
    action: 'takeScreenshot',
    key: `${platformAlt}+Enter`,
    category: 'Screenshot & AI'
  },
  appendScreenshot: {
    action: 'appendScreenshot',
    key: `${platformAlt}+Shift+Enter`,
    category: 'Screenshot & AI'
  },
  stopSolutionStream: {
    action: 'stopSolutionStream',
    key: `${platformAlt}+.`,
    category: 'Screenshot & AI'
  },
  toggleTranscription: {
    action: 'toggleTranscription',
    key: 'CommandOrControl+Shift+T',
    category: 'Screenshot & AI'
  },
  clearTranscription: {
    action: 'clearTranscription',
    key: `${platformAlt}+Shift+T`,
    category: 'Screenshot & AI'
  },
  copyLatestAnswer: {
    action: 'copyLatestAnswer',
    key: `${platformAlt}+C`,
    category: 'Screenshot & AI'
  },
  pageUp: { action: 'pageUp', key: 'CommandOrControl+J', category: 'Navigation' },
  pageDown: { action: 'pageDown', key: 'CommandOrControl+K', category: 'Navigation' },
  moveMainWindowUp: {
    action: 'moveMainWindowUp',
    key: 'CommandOrControl+Up',
    category: 'Window Movement'
  },
  moveMainWindowDown: {
    action: 'moveMainWindowDown',
    key: 'CommandOrControl+Down',
    category: 'Window Movement'
  },
  moveMainWindowLeft: {
    action: 'moveMainWindowLeft',
    key: 'CommandOrControl+Left',
    category: 'Window Movement'
  },
  moveMainWindowRight: {
    action: 'moveMainWindowRight',
    key: 'CommandOrControl+Right',
    category: 'Window Movement'
  }
}

export const useShortcutsStore = create<ShortcutsStore>()(
  persist(
    (set) => ({
      shortcuts: Object.fromEntries(
        Object.entries(defaultShortcuts).map(([action, shortcut]) => [
          action,
          { ...shortcut, defaultKey: shortcut.key }
        ])
      ),
      updateShortcut: (action, shortcut) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: shortcut
          }
        }))
      },
      updateShortcuts: (shortcuts) => {
        set({ shortcuts })
      },
      setStatuses: (statuses) => {
        set((state) => {
          const shortcuts = { ...state.shortcuts }
          for (const { action, status } of statuses) {
            if (shortcuts[action]) {
              shortcuts[action] = { ...shortcuts[action], status: status as ShortcutStatus }
            }
          }
          return { shortcuts }
        })
      },
      resetShortcuts: () => {
        set({
          shortcuts: Object.fromEntries(
            Object.entries(defaultShortcuts).map(([action, shortcut]) => [
              action,
              { ...shortcut, defaultKey: shortcut.key }
            ])
          )
        })
      }
    }),
    {
      name: 'interview-coder-shortcuts',
      version: 12,
      migrate: (state: unknown, version: number) => {
        if (!isPersistedShortcutsState(state) || !state.shortcuts) return state as ShortcutsStore
        // Merge in any new default shortcuts that are missing
        const defaults = Object.fromEntries(
          Object.entries(defaultShortcuts).map(([action, shortcut]) => [
            action,
            { ...shortcut, defaultKey: shortcut.key }
          ])
        )
        const merged = {
          ...state,
          shortcuts: {
            ...defaults,
            ...state.shortcuts
          }
        } as ShortcutsStore

        // v2→v3: On Windows, migrate Alt shortcuts to CommandOrControl (Ctrl)
        if (version < 3 && !isMac) {
          for (const [action, shortcut] of Object.entries(merged.shortcuts)) {
            merged.shortcuts[action] = {
              ...shortcut,
              key: shortcut.key.replace(/\bAlt\b/g, 'CommandOrControl'),
              defaultKey: shortcut.defaultKey.replace(/\bAlt\b/g, 'CommandOrControl')
            }
          }
        }

        // v6→v7: Move toggleTranscription off the old Alt+T / Ctrl+Alt+T binding.
        // On macOS, Option+letter is consumed by the input layer as a special
        // character, so the global shortcut never fired. Adopt the new reliable
        // default for users still on the previous default key.
        if (version < 7) {
          const toggle = merged.shortcuts.toggleTranscription
          const newDefault = 'CommandOrControl+Shift+T'
          const oldDefaults = ['Alt+T', 'CommandOrControl+T']
          if (toggle && oldDefaults.includes(toggle.key)) {
            merged.shortcuts.toggleTranscription = {
              ...toggle,
              key: newDefault,
              defaultKey: newDefault
            }
          }
        }

        return merged
      }
    }
  )
)

export const useShortcuts = (): Record<string, Shortcut> =>
  useShortcutsStore((state) => state.shortcuts)

export const useShortcut = (action: string): Shortcut | undefined =>
  useShortcutsStore((state) => state.shortcuts[action])

export const useShortcutsActions = () =>
  useShortcutsStore(
    useShallow((state) => ({
      updateShortcut: state.updateShortcut,
      resetShortcuts: state.resetShortcuts
    }))
  )

export const useShortcutsWithActions = () =>
  useShortcutsStore(
    useShallow((state) => ({
      shortcuts: state.shortcuts,
      updateShortcut: state.updateShortcut,
      resetShortcuts: state.resetShortcuts
    }))
  )
