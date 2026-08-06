import { useState } from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useStrategySettings } from '@/lib/store/settings'
import { isSupportedLanguageCode } from '../../../shared/languages'
import { PROMPT_PRESET_IDS } from '../../../shared/prompt-presets'
import { SelectLanguage } from './SelectLanguage'
import { LanguageOptions, SettingRow, SettingsSection } from './components'

const presetLabelKey: Record<string, string> = {
  default: 'settings.strategy.presetDefault',
  concise: 'settings.strategy.presetConcise',
  codeOnly: 'settings.strategy.presetCodeOnly',
  interview: 'settings.strategy.presetInterview'
}

export function StrategySettingsSection() {
  const { t } = useTranslation()
  const {
    codeLanguage,
    customPrompt,
    promptPreset,
    appMode,
    translationEnabled,
    translationTargetLanguage,
    updateSetting
  } = useStrategySettings()
  const [enableCustomPrompt, setEnableCustomPrompt] = useState(customPrompt.trim().length > 0)

  const handleCustomPromptToggle = (checked: boolean) => {
    setEnableCustomPrompt(checked)
    if (!checked) updateSetting('customPrompt', '')
  }

  return (
    <SettingsSection
      icon={Languages}
      title={t('settings.strategy.title')}
      description={t('settings.strategy.desc')}
    >
      <SettingRow
        title={t('settings.strategy.appMode')}
        description={t('settings.strategy.appModeDesc')}
      >
        <select
          className="settings-select"
          value={appMode}
          onChange={(event) => updateSetting('appMode', event.target.value)}
        >
          <option value="algorithm">{t('settings.strategy.modeAlgorithm')}</option>
          <option value="general">{t('settings.strategy.modeGeneral')}</option>
        </select>
      </SettingRow>
      <SettingRow
        title={t('settings.strategy.translation')}
        description={t('settings.strategy.translationDesc')}
      >
        <Switch
          checked={translationEnabled}
          onCheckedChange={(checked) => updateSetting('translationEnabled', checked)}
        />
      </SettingRow>
      {translationEnabled && (
        <SettingRow
          title={t('settings.strategy.translationTargetLang')}
          description={t('settings.strategy.translationTargetLangDesc')}
        >
          <select
            className="settings-select"
            value={translationTargetLanguage}
            onChange={(event) => {
              if (isSupportedLanguageCode(event.target.value)) {
                updateSetting('translationTargetLanguage', event.target.value)
              }
            }}
          >
            <LanguageOptions />
          </select>
        </SettingRow>
      )}
      <SettingRow
        title={t('settings.strategy.customPrompt')}
        description={t('settings.strategy.customPromptDesc')}
      >
        <Switch checked={enableCustomPrompt} onCheckedChange={handleCustomPromptToggle} />
      </SettingRow>
      {enableCustomPrompt ? (
        <Textarea
          value={customPrompt}
          onChange={(event) => updateSetting('customPrompt', event.target.value)}
          placeholder={t('settings.strategy.customPromptPlaceholder')}
          className="min-h-28 border-[var(--hairline)] bg-[var(--surface-3)] text-[var(--text-primary)]"
          rows={4}
        />
      ) : (
        <>
          <SettingRow
            title={t('settings.strategy.outputStyle')}
            description={t('settings.strategy.outputStyleDesc')}
          >
            <select
              className="settings-select"
              value={promptPreset}
              onChange={(event) => updateSetting('promptPreset', event.target.value)}
            >
              {PROMPT_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(presetLabelKey[id])}
                </option>
              ))}
            </select>
          </SettingRow>
          {appMode === 'algorithm' && (
            <SettingRow
              title={t('settings.strategy.codeLanguage')}
              description={t('settings.strategy.codeLanguageDesc')}
            >
              <SelectLanguage
                value={codeLanguage}
                onChange={(value) => updateSetting('codeLanguage', value)}
              />
            </SettingRow>
          )}
        </>
      )}
    </SettingsSection>
  )
}
