import { Keyboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CustomShortcuts, ResetDefaultShortcuts } from './CustomShortcuts'
import { SettingsSection } from './components'

export function ShortcutsSettingsSection() {
  const { t } = useTranslation()
  return (
    <SettingsSection
      icon={Keyboard}
      title={t('settings.shortcuts.title')}
      description={t('settings.shortcuts.desc')}
    >
      <div className="mb-4 flex justify-end">
        <ResetDefaultShortcuts />
      </div>
      <CustomShortcuts />
    </SettingsSection>
  )
}
