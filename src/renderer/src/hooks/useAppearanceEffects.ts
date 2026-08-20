import { useEffect } from 'react'
import {
  clampOpacity,
  OPACITY_DEFAULTS,
  type AdjustableOpacityTarget
} from '../../../shared/opacity'
import { clampFontSize } from '../../../shared/font-size'
import { clampZeroUiBackgroundOpacity } from '../../../shared/zero-ui-theme'
import { useAppearanceSettings, useSettingsStore } from '@/lib/store/settings'

function setOpacitySetting(target: AdjustableOpacityTarget, value: number): void {
  const state = useSettingsStore.getState()
  if (target === 'zeroUiBackground') {
    const light = state.zeroUiBackdrop === 'light'
    const key = light ? 'zeroUiLightBackgroundOpacity' : 'zeroUiDarkBackgroundOpacity'
    state.updateSetting(key, clampZeroUiBackgroundOpacity(value, state[key]))
    return
  }
  const nextValue = clampOpacity(target, value)
  if (target === 'overall') state.updateSetting('overallOpacity', nextValue)
  else if (target === 'window') state.updateSetting('opacity', nextValue)
  else if (target === 'text') state.updateSetting('textOpacity', nextValue)
  else state.updateSetting('iconOpacity', nextValue)
}

function getOpacitySetting(target: AdjustableOpacityTarget): number {
  const state = useSettingsStore.getState()
  if (target === 'zeroUiBackground') {
    return state.zeroUiBackdrop === 'light'
      ? state.zeroUiLightBackgroundOpacity
      : state.zeroUiDarkBackgroundOpacity
  }
  if (target === 'overall') return state.overallOpacity
  if (target === 'window') return state.opacity
  if (target === 'text') return state.textOpacity
  return state.iconOpacity
}

export function useAppearanceEffects(): void {
  const {
    overallOpacity,
    opacity,
    textOpacity,
    iconOpacity,
    uiFontSize,
    answerFontSize,
    codeBlockTheme,
    zeroUiMode,
    zeroUiBackdrop,
    zeroUiDarkTextColor,
    zeroUiDarkBackgroundColor,
    zeroUiDarkBackgroundOpacity,
    zeroUiLightTextColor,
    zeroUiLightBackgroundColor,
    zeroUiLightBackgroundOpacity,
    zeroUiBorderVisible
  } = useAppearanceSettings()

  useEffect(() => {
    window.api.setWindowOpacity(clampOpacity('overall', overallOpacity))
  }, [overallOpacity])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--window-opacity', clampOpacity('window', opacity).toString())
    return () => {
      root.removeProperty('--window-opacity')
    }
  }, [opacity])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--content-opacity', clampOpacity('text', textOpacity).toString())
    return () => {
      root.removeProperty('--content-opacity')
    }
  }, [textOpacity])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--icon-opacity', clampOpacity('icon', iconOpacity).toString())
    return () => {
      root.removeProperty('--icon-opacity')
    }
  }, [iconOpacity])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--ui-font-size', `${clampFontSize('ui', uiFontSize)}px`)
    return () => {
      root.removeProperty('--ui-font-size')
    }
  }, [uiFontSize])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--answer-font-size', `${clampFontSize('answer', answerFontSize)}px`)
    return () => {
      root.removeProperty('--answer-font-size')
    }
  }, [answerFontSize])

  useEffect(() => {
    document.documentElement.dataset.codeTheme = codeBlockTheme
    return () => {
      delete document.documentElement.dataset.codeTheme
    }
  }, [codeBlockTheme])

  useEffect(() => {
    const light = zeroUiBackdrop === 'light'
    const textColor = light ? zeroUiLightTextColor : zeroUiDarkTextColor
    const backgroundColor = light ? zeroUiLightBackgroundColor : zeroUiDarkBackgroundColor
    const backgroundOpacity = light ? zeroUiLightBackgroundOpacity : zeroUiDarkBackgroundOpacity
    const root = document.documentElement.style

    root.setProperty('--zero-ui-text-color', textColor)
    root.setProperty('--zero-ui-background-color', backgroundColor)
    root.setProperty(
      '--zero-ui-background-opacity',
      clampZeroUiBackgroundOpacity(backgroundOpacity).toString()
    )
    document.documentElement.dataset.zeroUiBackdrop = zeroUiBackdrop
    document.documentElement.dataset.zeroUiMode = zeroUiMode ? 'true' : 'false'
    document.documentElement.dataset.zeroUiBorder = zeroUiBorderVisible ? 'true' : 'false'
    return () => {
      root.removeProperty('--zero-ui-text-color')
      root.removeProperty('--zero-ui-background-color')
      root.removeProperty('--zero-ui-background-opacity')
      delete document.documentElement.dataset.zeroUiBackdrop
      delete document.documentElement.dataset.zeroUiMode
      delete document.documentElement.dataset.zeroUiBorder
    }
  }, [
    zeroUiBackdrop,
    zeroUiBorderVisible,
    zeroUiDarkBackgroundColor,
    zeroUiDarkBackgroundOpacity,
    zeroUiDarkTextColor,
    zeroUiLightBackgroundColor,
    zeroUiLightBackgroundOpacity,
    zeroUiLightTextColor,
    zeroUiMode
  ])

  useEffect(() => {
    window.api.onAdjustOpacity(({ target, delta }) => {
      setOpacitySetting(target, getOpacitySetting(target) + delta)
    })
    window.api.onResetWindowAppearance(() => {
      setOpacitySetting('overall', OPACITY_DEFAULTS.overall)
      setOpacitySetting('window', 1)
      setOpacitySetting('text', OPACITY_DEFAULTS.text)
      setOpacitySetting('icon', OPACITY_DEFAULTS.icon)
    })
    return () => {
      window.api.removeAdjustOpacityListener()
      window.api.removeResetWindowAppearanceListener()
    }
  }, [])
}
