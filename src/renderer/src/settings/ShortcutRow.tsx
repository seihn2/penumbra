import { useTranslation } from 'react-i18next'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { useShortcut, ShortcutStatus } from '@/lib/store/shortcuts'

export function ShortcutRow({
  label,
  description,
  shortcut: shortcutAction,
  disabled,
  recordingAction,
  setRecordingAction
}: {
  label: string
  description?: string
  shortcut: string
  disabled?: boolean
  recordingAction: string | null
  setRecordingAction: (action: string | null) => void
}) {
  const { t } = useTranslation()
  const shortcut = useShortcut(shortcutAction)
  const isRecording = recordingAction === shortcutAction

  return shortcut ? (
    <div
      className={`flex items-center justify-between${disabled ? ' opacity-40 pointer-events-none' : ''}`}
    >
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">{label}</label>
        {description && <p className="text-xs font-light">{description}</p>}
        {shortcut.status === ShortcutStatus.Failed && !isRecording && (
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">
            {t('settings.shortcuts.failed')}
          </span>
        )}
      </div>
      <span
        className="cursor-pointer"
        onClick={() => setRecordingAction(isRecording ? null : shortcutAction)}
      >
        {!isRecording ? (
          <ShortcutRenderer shortcut={shortcut.key} />
        ) : (
          <span className="font-mono text-sm align-middle rounded-md pl-2 pr-1 py-1 transition-colors bg-[var(--surface-3)] animate-pulse">
            {t('settings.shortcuts.recording')}
          </span>
        )}
      </span>
    </div>
  ) : null
}
