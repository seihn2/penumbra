import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router'
import { Toaster, toast } from 'sonner'
import CoderPage from '@/coder'
import SettingsPage from '@/settings'
import HelpPage from '@/help'
import { UpdateBanner } from '@/components/UpdateBanner'
import { useSettingsStore } from '@/lib/store/settings'
import { useShortcuts, useShortcutsStore } from '@/lib/store/shortcuts'
import { isMac } from '@/lib/utils/env'
import i18n from '@/lib/i18n'
import { accentVarsFromHex } from '../../shared/accent-color'
import { resolveReduceMotion } from '../../shared/motion-preference'
import {
  getMainProcessHydrationPatch,
  pickMainProcessSettings
} from '@/lib/settings/main-process-sync'

// macOS convention: Cmd+, toggles settings (Ctrl+, elsewhere). On the settings
// page it navigates back; otherwise it opens settings. Scoped to the focused
// window via a keydown listener rather than a global shortcut.
function GlobalAppShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey
      if (modifier && event.key === ',') {
        event.preventDefault()
        if (location.pathname === '/settings') {
          navigate(-1)
        } else {
          navigate('/settings')
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, location.pathname])

  return null
}

export default function App() {
  const [initialized, setInitialized] = useState(false)
  const settingsStore = useSettingsStore()
  const shortcuts = useShortcuts()

  useEffect(() => {
    window.api.getAppSettings().then((settings) => {
      settingsStore.syncSettings(getMainProcessHydrationPatch(settings, settingsStore))
      setInitialized(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initialized) {
      window.api.updateAppSettings(pickMainProcessSettings(settingsStore))
    }
  }, [initialized, settingsStore])

  useEffect(() => {
    window.api.initShortcuts(shortcuts).then((statuses) => {
      useShortcutsStore.getState().setStatuses(statuses)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (i18n.language !== settingsStore.uiLanguage) {
      i18n.changeLanguage(settingsStore.uiLanguage)
    }
    document.documentElement.lang = settingsStore.uiLanguage
  }, [settingsStore.uiLanguage])

  // Apply the custom accent color globally (all routes), so settings/help pages
  // re-theme too — not just the coder page.
  useEffect(() => {
    const { accent, accentSoft, accentBorder } = accentVarsFromHex(settingsStore.accentColor)
    const root = document.documentElement.style
    root.setProperty('--accent', accent)
    root.setProperty('--accent-soft', accentSoft)
    root.setProperty('--accent-border', accentBorder)
    // Also drive shadcn's primary/ring directly so switches/buttons/checkboxes
    // (which use bg-primary) re-theme instantly with the accent.
    root.setProperty('--primary', accent)
    root.setProperty('--ring', accent)
  }, [settingsStore.accentColor])

  // Reflect the resolved reduce-motion preference (OS signal + in-app override)
  // onto <html data-reduce-motion>, which the CSS baseline reads to neutralize
  // animations app-wide (P1#33 accessibility).
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (): void => {
      const reduce = resolveReduceMotion(settingsStore.reduceMotion, media.matches)
      document.documentElement.toggleAttribute('data-reduce-motion', reduce)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settingsStore.reduceMotion])

  // Keep the stealth setting in sync when toggled via the global shortcut, so
  // the settings checkbox reflects the live state and a toast confirms it.
  useEffect(() => {
    window.api.onContentProtectionChanged((enabled) => {
      useSettingsStore.getState().updateSetting('contentProtectionEnabled', enabled)
      toast(enabled ? i18n.t('settings.privacy.stealthOn') : i18n.t('settings.privacy.stealthOff'))
    })
    return () => window.api.removeContentProtectionChangedListener()
  }, [])

  return (
    <>
      <HashRouter>
        <GlobalAppShortcuts />
        <Routes>
          <Route index element={<CoderPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
        </Routes>
      </HashRouter>

      <Toaster />
      <UpdateBanner />
    </>
  )
}
