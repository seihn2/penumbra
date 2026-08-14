import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(__dirname, `../${path}`), 'utf8')
}

describe('answer-service profile wiring', () => {
  it('keeps raw answer-service keys in the main process', () => {
    const settings = source('src/main/settings.ts')
    const sync = source('src/renderer/src/lib/settings/main-process-sync.ts')

    expect(settings).toContain("ipcMain.handle('activate-answer-service-profile'")
    expect(settings).toContain("ipcMain.handle('save-answer-service-key'")
    expect(settings).toContain("ipcMain.handle('delete-answer-service-key'")
    expect(settings).toContain("return { ...settings, apiKey: '' }")
    expect(sync).not.toContain("'apiKey',")
  })

  it('supports profile CRUD and per-profile model discovery in settings', () => {
    const section = source('src/renderer/src/settings/ModelSettingsSection.tsx')

    expect(section).toContain('addAnswerServiceProfile(profile)')
    expect(section).toContain('setActiveAnswerServiceProfile(event.target.value)')
    expect(section).toContain('removeAnswerServiceProfile(activeProfile.id)')
    expect(section).toContain('window.api.fetchAvailableModels()')
    expect(section).toContain('value={activeProfile.protocol}')
    expect(section).toContain('<option value="responses">')
    expect(section).toContain('<option value="chat-completions">')
    expect(section).toContain('onRefresh={() => void fetchModels()}')
    expect(section).toContain(
      'updateAnswerServiceProfile(activeProfile.id, { modelCache: result.models })'
    )
    expect(section).not.toContain('setTimeout(() => void fetchModels(false)')
    expect(section).not.toContain('void fetchModels(false)')
    expect(section).not.toContain('MODEL_CATALOG_UPDATED_AT')
  })

  it('distinguishes cached models from a manual refresh in every locale', () => {
    for (const locale of ['zh', 'en', 'ja', 'ko', 'fr']) {
      const translations = source(`src/renderer/src/lib/i18n/locales/${locale}.ts`)

      expect(translations).toContain('cached:')
      expect(translations).toContain('fetchFailed:')
      expect(translations).toContain('protocolAuto:')
      expect(translations).not.toContain('catalogUpdated:')
      expect(translations).not.toContain('fetchAutoFailed:')
    }
  })
})
