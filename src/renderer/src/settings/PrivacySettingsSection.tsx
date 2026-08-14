import { Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { usePrivacySettings, useSettingValue } from '@/lib/store/settings'
import { useShortcut } from '@/lib/store/shortcuts'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { isMac } from '@/lib/utils/env'
import { SettingRow, SettingsSection } from './components'

export function PrivacySettingsSection() {
  const { t } = useTranslation()
  const { hideDockIcon, contentProtectionEnabled, updateSetting } = usePrivacySettings()
  const answerServiceKeyConfigured = useSettingValue('answerServiceKeyConfigured')
  const dashscopeApiKey = useSettingValue('dashscopeApiKey')
  const configuredSecretCount =
    Number(answerServiceKeyConfigured) + Number(Boolean(dashscopeApiKey))
  const stealthShortcut = useShortcut('toggleContentProtection')
  const dockShortcut = useShortcut('toggleDockIcon')

  return (
    <SettingsSection
      icon={Shield}
      title={t('settings.privacy.title')}
      description={t('settings.privacy.desc')}
    >
      <p className="settings-note">{t('settings.privacy.note')}</p>
      <div className="settings-security-summary">
        <div>
          <div className="settings-row-title">{t('settings.privacy.secretStorage')}</div>
          <p className="settings-row-desc">
            {t('settings.privacy.secretCount', { count: configuredSecretCount })}
          </p>
        </div>
        <div className="settings-security-badge">safeStorage</div>
      </div>
      <p className="settings-note settings-note-info">{t('settings.privacy.verifyNote')}</p>
      <SettingRow
        title={t('settings.privacy.contentProtection')}
        description={t('settings.privacy.contentProtectionDesc')}
      >
        <div className="flex items-center gap-2">
          {stealthShortcut?.key && (
            <ShortcutRenderer
              shortcut={stealthShortcut.key}
              className="bg-[var(--surface-3)] text-[var(--text-secondary)]"
            />
          )}
          <Switch
            checked={contentProtectionEnabled}
            onCheckedChange={(checked) => {
              updateSetting('contentProtectionEnabled', checked)
              // Enabling stealth can make the window invisible on some macOS
              // setups — warn and point at the recovery shortcut.
              if (checked)
                toast.warning(t('settings.privacy.contentProtectionWarn'), { duration: 7000 })
            }}
          />
        </div>
      </SettingRow>
      {isMac && (
        <SettingRow
          title={t('settings.privacy.hideDock')}
          description={t('settings.privacy.hideDockDesc')}
        >
          <div className="flex items-center gap-2">
            {dockShortcut?.key && (
              <ShortcutRenderer
                shortcut={dockShortcut.key}
                className="bg-[var(--surface-3)] text-[var(--text-secondary)]"
              />
            )}
            <Switch
              checked={hideDockIcon}
              onCheckedChange={(checked) => updateSetting('hideDockIcon', checked)}
            />
          </div>
        </SettingRow>
      )}
    </SettingsSection>
  )
}
