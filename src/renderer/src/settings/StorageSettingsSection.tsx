import { FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { useStorageSettings } from '@/lib/store/settings'
import { SettingRow, SettingsSection } from './components'

interface DisplayInfo {
  id: string
  label: string
  primary: boolean
}

export function StorageSettingsSection() {
  const { t } = useTranslation()
  const { screenshotAutoSave, screenshotDir, screenshotDisplayId, updateSetting } =
    useStorageSettings()
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

  useEffect(() => {
    window.api.listDisplays().then(setDisplays)
  }, [])

  const selectScreenshotDir = async () => {
    const dir = await window.api.selectScreenshotDir()
    if (dir) updateSetting('screenshotDir', dir)
  }

  return (
    <SettingsSection
      icon={FolderOpen}
      title={t('settings.storage.title')}
      description={t('settings.storage.desc')}
    >
      {displays.length > 1 && (
        <SettingRow
          title={t('settings.storage.screenshotDisplay')}
          description={t('settings.storage.screenshotDisplayDesc')}
        >
          <select
            className="settings-select"
            value={screenshotDisplayId}
            onChange={(event) => updateSetting('screenshotDisplayId', event.target.value)}
          >
            <option value="">{t('settings.storage.screenshotDisplayPrimary')}</option>
            {displays.map((display) => (
              <option key={display.id} value={display.id}>
                {display.label}
                {display.primary ? ` · ${t('settings.storage.screenshotDisplayPrimary')}` : ''}
              </option>
            ))}
          </select>
        </SettingRow>
      )}
      <SettingRow
        title={t('settings.storage.autoSave')}
        description={t('settings.storage.autoSaveDesc')}
      >
        <Switch
          checked={screenshotAutoSave}
          onCheckedChange={(checked) => updateSetting('screenshotAutoSave', checked)}
        />
      </SettingRow>
      {screenshotAutoSave && (
        <SettingRow
          title={t('settings.storage.saveDir')}
          description={t('settings.storage.saveDirDesc')}
        >
          <button
            className="settings-path-button"
            title={t('settings.storage.selectDir')}
            aria-label={t('settings.storage.selectDir')}
            onClick={selectScreenshotDir}
          >
            {screenshotDir || t('settings.storage.defaultDir')}
          </button>
        </SettingRow>
      )}
    </SettingsSection>
  )
}
