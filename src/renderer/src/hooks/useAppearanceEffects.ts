import { useEffect } from 'react'
import { clampOpacity, OPACITY_DEFAULTS, type OpacityTarget } from '../../../shared/opacity'
import { clampFontSize } from '../../../shared/font-size'
import { useAppearanceSettings, useSettingsStore } from '@/lib/store/settings'

function setOpacitySetting(target: OpacityTarget, value: number): void {
  const state = useSettingsStore.getState()
  const nextValue = clampOpacity(target, value)
  if (target === 'overall') state.updateSetting('overallOpacity', nextValue)
  else if (target === 'window') state.updateSetting('opacity', nextValue)
  else if (target === 'text') state.updateSetting('textOpacity', nextValue)
  else state.updateSetting('iconOpacity', nextValue)
}

function getOpacitySetting(target: OpacityTarget): number {
  const state = useSettingsStore.getState()
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
    zeroUiBackdrop
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
    document.documentElement.dataset.zeroUiBackdrop = zeroUiBackdrop
    return () => {
      delete document.documentElement.dataset.zeroUiBackdrop
    }
  }, [zeroUiBackdrop])

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
