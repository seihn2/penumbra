import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useShortcuts, useShortcutsWithActions, useShortcutsStore } from '@/lib/store/shortcuts'
import { useSettingValue } from '@/lib/store/settings'
import { shortcutCategories, shortcutMetadata } from '@/lib/shortcut-metadata'
import { ShortcutRow } from './ShortcutRow'
import { useShortcutRecorder } from './useShortcutRecorder'

export function CustomShortcuts() {
  const { t } = useTranslation()
  const dashscopeApiKey = useSettingValue('dashscopeApiKey')
  const { recordingAction, setRecordingAction } = useShortcutRecorder()

  return (
    <div className="space-y-4">
      {shortcutCategories.map((category) => (
        <div key={category.id} className="space-y-2">
          <h3 className="text-sm text-[var(--text-tertiary)]">
            {t(`shortcutCategory.${category.id}`)}
          </h3>
          {shortcutMetadata
            .filter((shortcut) => shortcut.category === category.id)
            .map((shortcut) => (
              <ShortcutRow
                key={shortcut.action}
                label={t(shortcut.label)}
                description={shortcut.description ? t(shortcut.description) : undefined}
                shortcut={shortcut.action}
                disabled={shortcut.requiresDashscopeApiKey && !dashscopeApiKey}
                recordingAction={recordingAction}
                setRecordingAction={setRecordingAction}
              />
            ))}
        </div>
      ))}
    </div>
  )
}

export function ResetDefaultShortcuts() {
  const { t } = useTranslation()
  const shortcuts = useShortcuts()
  const { resetShortcuts } = useShortcutsWithActions()
  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-auto"
      onClick={async () => {
        const statuses = await window.api.updateShortcuts(
          Object.values(shortcuts)
            .filter(({ key, defaultKey }) => key !== defaultKey)
            .map((shortcut) => ({
              ...shortcut,
              key: shortcut.defaultKey
            }))
        )
        resetShortcuts()
        useShortcutsStore.getState().setStatuses(statuses)
        toast.success(t('settings.shortcuts.resetSuccess'))
      }}
    >
      {t('settings.shortcuts.resetDefaults')}
    </Button>
  )
}
