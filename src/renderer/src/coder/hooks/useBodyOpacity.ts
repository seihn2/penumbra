import { useEffect } from 'react'
import { useAppearanceSettings } from '@/lib/store/settings'

const OVERALL_OPACITY_MIN = 0.2
// Floor the window/background opacity above 0 so repeated "decrease" presses
// can never make the whole window fully invisible (only traffic-lights left),
// which is unrecoverable without knowing the increase shortcut.
const WINDOW_OPACITY_MIN = 0.15
const TEXT_OPACITY_MIN = 0.2
const OPACITY_MAX = 1

function clamp(value: number, min: number) {
  return Math.min(OPACITY_MAX, Math.max(min, Math.round(value * 100) / 100))
}

export function useBodyOpacity(): void {
  const { overallOpacity, opacity, textOpacity, answerFontSize, updateSetting } =
    useAppearanceSettings()

  // 1) Overall opacity = native whole-window opacity (bg + text + chrome).
  useEffect(() => {
    window.api.setWindowOpacity(overallOpacity)
  }, [overallOpacity])

  // Answer area font size (px), applied to the markdown solution.
  useEffect(() => {
    document.documentElement.style.setProperty('--answer-font-size', `${answerFontSize}px`)
    return () => {
      document.documentElement.style.removeProperty('--answer-font-size')
    }
  }, [answerFontSize])

  // 2) Window opacity = background/chrome alpha only. At the floor the panels
  //    are faint but never fully invisible. Clamp on apply too, so a stale
  //    persisted 0 from older builds can't render the window unrecoverable.
  useEffect(() => {
    const safe = Math.max(WINDOW_OPACITY_MIN, opacity)
    document.documentElement.style.setProperty('--window-opacity', safe.toString())
    return () => {
      document.documentElement.style.removeProperty('--window-opacity')
    }
  }, [opacity])

  // 3) Text opacity = text fill only, independent of background.
  useEffect(() => {
    document.documentElement.style.setProperty('--content-opacity', textOpacity.toString())
    return () => {
      document.documentElement.style.removeProperty('--content-opacity')
    }
  }, [textOpacity])

  // Global shortcuts adjust opacity through the main process.
  useEffect(() => {
    window.api.onAdjustOpacity(({ target, delta }) => {
      if (target === 'overall') {
        updateSetting('overallOpacity', clamp(overallOpacity + delta, OVERALL_OPACITY_MIN))
      } else if (target === 'window') {
        updateSetting('opacity', clamp(opacity + delta, WINDOW_OPACITY_MIN))
      } else {
        updateSetting('textOpacity', clamp(textOpacity + delta, TEXT_OPACITY_MIN))
      }
    })
    return () => {
      window.api.removeAdjustOpacityListener()
    }
  }, [overallOpacity, opacity, textOpacity, updateSetting])
}
