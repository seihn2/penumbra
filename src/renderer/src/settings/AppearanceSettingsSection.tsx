import { SlidersHorizontal, Pipette, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useAppearanceSettings } from '@/lib/store/settings'
import { useShortcut } from '@/lib/store/shortcuts'
import { cn } from '@/lib/utils'
import { isMac } from '@/lib/utils/env'
import { UI_LANGUAGES } from '@/lib/i18n'
import { contrastRatio, meetsAaNormal } from '../../../shared/contrast'
import { MOTION_PREFERENCES } from '../../../shared/motion-preference'
import { OPACITY_MINIMUMS } from '../../../shared/opacity'
import { FONT_SIZE_MAXIMUMS, FONT_SIZE_MINIMUMS } from '../../../shared/font-size'
import { CODE_BLOCK_THEMES } from '../../../shared/code-block-theme'
import { TRAFFIC_LIGHT_MODES } from '../../../shared/traffic-light-mode'
import { ZERO_UI_BACKDROPS } from '../../../shared/zero-ui-theme'
import { SettingRow, SettingsSection } from './components'
import { ColorPicker } from './ColorPicker'
import ShortcutRenderer from '@/components/ShortcutRenderer'

// Curated accent presets — a calm spread across the hue wheel.
const ACCENT_PRESETS = ['#4aa3df', '#7c5cff', '#22c08b', '#e0833b', '#e0556e', '#9aa3ad']

// The dark surface the accent is drawn on as text/icon color (--surface-1 in
// base.css). Used to warn when a chosen accent has poor readability contrast.
const SURFACE_1 = '#131619'

function OpacitySlider({
  label,
  value,
  min,
  onChange
}: {
  label: string
  value: number
  min: number
  onChange: (value: number) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex w-72 items-center gap-3 text-xs text-[var(--text-tertiary)]">
      <span className="w-10 shrink-0">{t('settings.appearance.transparent')}</span>
      <Slider
        aria-label={label}
        min={min}
        max={1}
        step={0.05}
        value={[value]}
        onValueChange={(nextValue) => onChange(nextValue[0])}
      />
      <span className="w-9 shrink-0 text-right tabular-nums">{Math.round(value * 100)}%</span>
      <span className="w-8 shrink-0">{t('settings.appearance.opaque')}</span>
    </div>
  )
}

function FontSizeSlider({
  label,
  target,
  value,
  onChange
}: {
  label: string
  target: 'ui' | 'answer'
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex w-72 items-center gap-3 text-xs text-[var(--text-tertiary)]">
      <span className="text-[11px]">A</span>
      <Slider
        aria-label={label}
        min={FONT_SIZE_MINIMUMS[target]}
        max={FONT_SIZE_MAXIMUMS[target]}
        step={1}
        value={[value]}
        onValueChange={(nextValue) => onChange(nextValue[0])}
      />
      <span className="text-base">A</span>
      <span className="w-10 shrink-0 text-right tabular-nums">{value}px</span>
    </div>
  )
}

export function AppearanceSettingsSection() {
  const { t } = useTranslation()
  const {
    overallOpacity,
    opacity,
    textOpacity,
    iconOpacity,
    uiLanguage,
    uiFontSize,
    answerFontSize,
    accentColor,
    codeBlockTheme,
    reduceMotion,
    trafficLightMode,
    zeroUiMode,
    zeroUiBackdrop,
    updateSetting
  } = useAppearanceSettings()
  const zeroUiShortcut = useShortcut('toggleZeroUiMode')

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
                  ? 'border-[var(--accent-border)]'
                  : 'border-transparent'
              )}
              style={{
                backgroundColor: `color-mix(in srgb, ${color} calc(var(--window-opacity) * 100%), transparent)`
              }}
            />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--hairline)]"
                title={t('settings.appearance.accentColorCustom')}
                aria-label={t('settings.appearance.accentColorCustom')}
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} calc(var(--window-opacity) * 100%), transparent)`
                }}
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
        title={t('settings.appearance.zeroUiMode')}
        description={t('settings.appearance.zeroUiModeDesc')}
      >
        <div className="flex items-center gap-3">
          {zeroUiShortcut && <ShortcutRenderer shortcut={zeroUiShortcut.key} />}
          <Switch
            checked={zeroUiMode}
            onCheckedChange={(checked) => updateSetting('zeroUiMode', checked)}
            aria-label={t('settings.appearance.zeroUiMode')}
          />
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.zeroUiBackdrop')}
        description={t('settings.appearance.zeroUiBackdropDesc')}
      >
        <select
          className="settings-select"
          value={zeroUiBackdrop}
          onChange={(event) =>
            updateSetting(
              'zeroUiBackdrop',
              event.target.value as (typeof ZERO_UI_BACKDROPS)[number]
            )
          }
        >
          {ZERO_UI_BACKDROPS.map((backdrop) => (
            <option key={backdrop} value={backdrop}>
              {t(`settings.appearance.zeroUiBackdrops.${backdrop}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.uiFontSize')}
        description={t('settings.appearance.uiFontSizeDesc')}
      >
        <FontSizeSlider
          label={t('settings.appearance.uiFontSize')}
          target="ui"
          value={uiFontSize}
          onChange={(value) => updateSetting('uiFontSize', value)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.answerFontSize')}
        description={t('settings.appearance.answerFontSizeDesc')}
      >
        <FontSizeSlider
          label={t('settings.appearance.answerFontSize')}
          target="answer"
          value={answerFontSize}
          onChange={(value) => updateSetting('answerFontSize', value)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.codeBlockTheme')}
        description={t('settings.appearance.codeBlockThemeDesc')}
      >
        <select
          className="settings-select"
          value={codeBlockTheme}
          onChange={(event) =>
            updateSetting(
              'codeBlockTheme',
              event.target.value as (typeof CODE_BLOCK_THEMES)[number]
            )
          }
        >
          {CODE_BLOCK_THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {t(`settings.appearance.codeTheme.${theme}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
      </SettingRow>
      {isMac && (
        <SettingRow
          title={t('settings.appearance.trafficLightMode')}
          description={t('settings.appearance.trafficLightModeDesc')}
        >
          <select
            className="settings-select"
            value={trafficLightMode}
            onChange={(event) =>
              updateSetting(
                'trafficLightMode',
                event.target.value as (typeof TRAFFIC_LIGHT_MODES)[number]
              )
            }
          >
            {TRAFFIC_LIGHT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`settings.appearance.trafficLights.${mode}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </SettingRow>
      )}
      <SettingRow
        title={t('settings.appearance.overallOpacity')}
        description={t('settings.appearance.overallOpacityDesc')}
      >
        <OpacitySlider
          label={t('settings.appearance.overallOpacity')}
          min={OPACITY_MINIMUMS.overall}
          value={overallOpacity}
          onChange={(value) => updateSetting('overallOpacity', value)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.windowOpacity')}
        description={t('settings.appearance.windowOpacityDesc')}
      >
        <OpacitySlider
          label={t('settings.appearance.windowOpacity')}
          min={OPACITY_MINIMUMS.window}
          value={opacity}
          onChange={(value) => updateSetting('opacity', value)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.textOpacity')}
        description={t('settings.appearance.textOpacityDesc')}
      >
        <OpacitySlider
          label={t('settings.appearance.textOpacity')}
          min={OPACITY_MINIMUMS.text}
          value={textOpacity}
          onChange={(value) => updateSetting('textOpacity', value)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.appearance.iconOpacity')}
        description={t('settings.appearance.iconOpacityDesc')}
      >
        <OpacitySlider
          label={t('settings.appearance.iconOpacity')}
          min={OPACITY_MINIMUMS.icon}
          value={iconOpacity}
          onChange={(value) => updateSetting('iconOpacity', value)}
        />
      </SettingRow>
    </SettingsSection>
  )
}
