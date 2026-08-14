import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(__dirname, `../${path}`), 'utf8')
}

describe('Dock icon shortcut wiring', () => {
  it('toggles the native Dock entry and synchronizes the setting', () => {
    const main = source('src/main/shortcuts.ts')
    const preload = source('src/preload/index.ts')
    const app = source('src/renderer/src/App.tsx')

    expect(main).toContain('toggleDockIcon: () =>')
    expect(main).toContain('applyDockVisibility(next)')
    expect(main).toContain("webContents.send('dock-icon-visibility-changed', next)")
    expect(preload).toContain("ipcRenderer.on('dock-icon-visibility-changed'")
    expect(app).toContain("updateSetting('hideDockIcon', hidden)")
  })

  it('shows the shortcut beside the Privacy setting and in shortcut customization', () => {
    const privacy = source('src/renderer/src/settings/PrivacySettingsSection.tsx')
    const metadata = source('src/renderer/src/lib/shortcut-metadata.ts')
    const shortcuts = source('src/renderer/src/lib/store/shortcuts.ts')

    expect(privacy).toContain("useShortcut('toggleDockIcon')")
    expect(privacy).toContain('shortcut={dockShortcut.key}')
    expect(metadata).toContain("meta('toggleDockIcon', 'Window Management'")
    expect(shortcuts).toContain('toggleDockIcon: {')
  })

  it('keeps the UI copy complete in every locale', () => {
    for (const locale of ['zh', 'en', 'ja', 'ko', 'fr']) {
      const translations = source(`src/renderer/src/lib/i18n/locales/${locale}.ts`)
      expect(translations).toContain('toggleDockIcon:')
      expect(translations).toContain('dockHidden:')
      expect(translations).toContain('dockShown:')
    }
  })
})
