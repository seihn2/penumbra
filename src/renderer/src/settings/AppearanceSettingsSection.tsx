import { SlidersHorizontal, Pipette, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/slider'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useAppearanceSettings } from '@/lib/store/settings'
import { cn } from '@/lib/utils'
import { UI_LANGUAGES } from '@/lib/i18n'
import { contrastRatio, meetsAaNormal } from '../../../shared/contrast'
import { MOTION_PREFERENCES } from '../../../shared/motion-preference'
import { SettingRow, SettingsSection } from './components'
import { ColorPicker } from './ColorPicker'

// Curated accent presets — a calm spread across the hue wheel.
const ACCENT_PRESETS = ['#4aa3df', '#7c5cff', '#22c08b', '#e0833b', '#e0556e', '#9aa3ad']

// The dark surface the accent is drawn on as text/icon color (--surface-1 in
// base.css). Used to warn when a chosen accent has poor readability contrast.
const SURFACE_1 = '#131619'

export function AppearanceSettingsSection() {
  const { t } = useTranslation()
  const {
    overallOpacity,
    opacity,
    textOpacity,
    uiLanguage,
    answerFontSize,
    accentColor,
    reduceMotion,
    updateSetting
  } = useAppearanceSettings()

  // Warn when the chosen accent is hard to read on the app's dark surface (it's
  // used as text/icon color). Low contrast → an a11y hint (P1#33).
  const accentContrast = contrastRatio(accentColor, SURFACE_1)
  const accentReadable = meetsAaNormal(accentColor, SURFACE_1)

  return (
    <SettingsSection
      icon={SlidersHorizontal}
      title={t('settings.appearance.title')}
      description={t('settings.appearance.desc')}
    >
      <SettingRow
        title={t('settings.appearance.accentColor')}
        description={t('settings.appearance.accentColorDesc')}
      >
        <div className="flex items-center gap-2">
          {ACCENT_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => updateSetting('accentColor', color)}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                accentColor.toLowerCase() === color.toLowerCase()
                  ? 'border-[var(--text-primary)]'
                  : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--hairline)]"
                title={t('settings.appearance.accentColorCustom')}
                aria-label={t('settings.appearance.accentColorCustom')}
                style={{ backgroundColor: accentColor }}
              >
                <Pipette className="h-3 w-3 text-white mix-blend-difference" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3">
              <ColorPicker
                value={accentColor}
                onChange={(hex) => updateSetting('accentColor', hex)}
              />
            </PopoverContent>
          </Popover>
        </div>
        {!accentReadable && accentContrast !== null && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t('settings.appearance.accentLowContrast', { ratio: accentContrast.toFixed(1) })}
          </div>
        )}
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.uiLanguage')}
        description={t('settings.appearance.uiLanguageDesc')}
      >
        <select
          className="settings-select"
          value={uiLanguage}
          onChange={(event) => updateSetting('uiLanguage', event.target.value)}
        >
          {UI_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.reduceMotion')}
        description={t('settings.appearance.reduceMotionDesc')}
      >
        <select
          className="settings-select"
          value={reduceMotion}
          onChange={(event) =>
            updateSetting('reduceMotion', event.target.value as (typeof MOTION_PREFERENCES)[number])
          }
        >
          {MOTION_PREFERENCES.map((pref) => (
            <option key={pref} value={pref}>
              {t(`settings.appearance.motion.${pref}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.answerFontSize')}
        description={t('settings.appearance.answerFontSizeDesc')}
      >
        <div className="flex w-64 items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span>A</span>
          <Slider
            min={12}
            max={22}
            step={1}
            value={[answerFontSize]}
            onValueChange={(value) => {
              updateSetting('answerFontSize', value[0])
              document.documentElement.style.setProperty('--answer-font-size', `${value[0]}px`)
            }}
          />
          <span className="text-base">A</span>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.overallOpacity')}
        description={t('settings.appearance.overallOpacityDesc')}
      >
        <div className="flex w-64 items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span>{t('settings.appearance.transparent')}</span>
          <Slider
            min={0.2}
            max={1}
            step={0.05}
            value={[overallOpacity]}
            onValueChange={(value) => {
              updateSetting('overallOpacity', value[0])
              window.api.setWindowOpacity(value[0])
            }}
          />
          <span>{t('settings.appearance.opaque')}</span>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.windowOpacity')}
        description={t('settings.appearance.windowOpacityDesc')}
      >
        <div className="flex w-64 items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span>{t('settings.appearance.transparent')}</span>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[opacity]}
            onValueChange={(value) => {
              updateSetting('opacity', value[0])
              document.documentElement.style.setProperty('--window-opacity', value[0].toString())
            }}
          />
          <span>{t('settings.appearance.opaque')}</span>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.textOpacity')}
        description={t('settings.appearance.textOpacityDesc')}
      >
        <div className="flex w-64 items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <span>{t('settings.appearance.transparent')}</span>
          <Slider
            min={0.2}
            max={1}
            step={0.05}
            value={[textOpacity]}
            onValueChange={(value) => {
              updateSetting('textOpacity', value[0])
              document.documentElement.style.setProperty('--content-opacity', value[0].toString())
            }}
          />
          <span>{t('settings.appearance.opaque')}</span>
        </div>
      </SettingRow>
    </SettingsSection>
  )
}
