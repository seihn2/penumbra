import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useShortcutsWithActions, useShortcutsStore } from '@/lib/store/shortcuts'
import { getShortcutAccelerator, isModifierKey } from '@/lib/utils/keyboard'

export function useShortcutRecorder() {
  const { t } = useTranslation()
  const { shortcuts, updateShortcut } = useShortcutsWithActions()
  const [recordingAction, setRecordingAction] = useState<string | null>(null)

  const onShortcutChange = useCallback(
    (action: string, key: string) => {
      // Reject a key already bound to another action: the OS-level
      // globalShortcut.register would silently fail for the duplicate,
      // leaving the UI showing a key that doesn't actually work.
      const conflict = Object.values(shortcuts).some((s) => s.action !== action && s.key === key)
      if (conflict) {
        toast.error(t('settings.shortcuts.conflict'))
        return
      }
      const newShortcut = { ...shortcuts[action], key }
      updateShortcut(action, newShortcut)
      window.api.updateShortcuts([newShortcut]).then((statuses) => {
        useShortcutsStore.getState().setStatuses(statuses)
      })
    },
    [shortcuts, updateShortcut, t]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!recordingAction) return

      event.preventDefault()
      if (isModifierKey(event.code)) return

      const accelerator = getShortcutAccelerator(event)
      if (event.code === 'Escape' && !accelerator) {
        setRecordingAction(null)
      }
      if (!accelerator) return

      onShortcutChange(recordingAction, accelerator)
      setRecordingAction(null)
    },
    [recordingAction, onShortcutChange]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return { recordingAction, setRecordingAction }
}
