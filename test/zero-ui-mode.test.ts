import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readRenderer = (file: string): string =>
  readFileSync(resolve(__dirname, `../src/renderer/src/${file}`), 'utf8')

describe('0 UI plain-text mode', () => {
  it('removes every surrounding coder surface while active', () => {
    const page = readRenderer('coder/index.tsx')
    const app = readRenderer('App.tsx')
    expect(page).toContain("useSettingValue('zeroUiMode')")
    expect(page).toContain('{!zeroUiMode && <AppHeader />}')
    expect(page).toContain('{!zeroUiMode && <InterviewCoachPanel />}')
    expect(page).toContain('{!zeroUiMode && <AppStatusBar />}')
    expect(page).toContain('{!zeroUiMode && <PrerequisitesChecker />}')
    expect(page).toContain('{!zeroUiMode && <HistoryPanel />}')
    expect(app).toContain('{!settingsStore.zeroUiMode && <Toaster />}')
    expect(app).toContain('{!settingsStore.zeroUiMode && <UpdateBanner />}')
  })

  it('renders assistant text literally in pre/code and filters user screenshots', () => {
    const content = readRenderer('coder/AppContent.tsx')
    expect(content).toContain("message.role === 'assistant'")
    expect(content).toContain('className="zero-ui-shell min-w-0 flex-1"')
    expect(content).toContain('<pre')
    expect(content).toContain('<code>{message.text}</code>')
    expect(content).not.toContain('<MarkdownRenderer>{message.text}</MarkdownRenderer>')
  })

  it('keeps an actionable empty-state recovery hint and falls back to the live solution stream', () => {
    const content = readRenderer('coder/AppContent.tsx')
    expect(content).toContain('solutionChunks')
    expect(content).toContain('zero-ui-empty-hint')
    expect(content).toContain('zeroUiEmptyHint')
  })

  it('keeps normal screenshots as compact thumbnails', () => {
    const css = readRenderer('assets/main.css')
    expect(css).toContain('width: min(112px, 32vw)')
    expect(css).toContain('aspect-ratio: 16 / 10')
  })

  it('applies independently customizable light and dark palettes', () => {
    const css = readRenderer('assets/main.css')
    const effects = readRenderer('hooks/useAppearanceEffects.ts')
    expect(css).toContain('var(--zero-ui-background-color)')
    expect(css).toContain('var(--zero-ui-background-opacity)')
    expect(css).toContain('var(--zero-ui-text-color)')
    expect(effects).toContain('document.documentElement.dataset.zeroUiBackdrop = zeroUiBackdrop')
    expect(effects).toContain("root.setProperty('--zero-ui-text-color'")
    expect(effects).toContain("root.setProperty('--zero-ui-background-color'")
    expect(effects).toContain("'--zero-ui-background-opacity',")
  })

  it('removes every CSS and native frame by default while keeping an opt-in border', () => {
    const css = readRenderer('assets/main.css')
    const effects = readRenderer('hooks/useAppearanceEffects.ts')
    const settings = readRenderer('settings/AppearanceSettingsSection.tsx')
    const main = readFileSync(
      resolve(__dirname, '../src/main/services/window-appearance.ts'),
      'utf8'
    )

    expect(css).toContain("html[data-zero-ui-mode='true'] #root")
    expect(css).toContain('box-shadow: none')
    expect(css).toContain("html[data-zero-ui-border='true'] .zero-ui-output")
    expect(effects).toContain('document.documentElement.dataset.zeroUiBorder')
    expect(settings).toContain("updateSetting('zeroUiBorderVisible', checked)")
    expect(main).toContain('window.setHasShadow(!enabled)')
  })

  it('provides a customizable global recovery toggle', () => {
    const shortcuts = readRenderer('lib/store/shortcuts.ts')
    const metadata = readRenderer('lib/shortcut-metadata.ts')
    const main = readFileSync(resolve(__dirname, '../src/main/shortcuts.ts'), 'utf8')
    expect(shortcuts).toContain('toggleZeroUiMode')
    expect(shortcuts).toContain('`${platformAlt}+Shift+H`')
    expect(metadata).toContain("meta('toggleZeroUiMode', 'Window Management'")
    expect(main).toContain('toggleZeroUiMode: () =>')
    expect(main).toContain("mainWindow.webContents.send('zero-ui-mode-changed', next)")
    expect(shortcuts).toContain('increaseZeroUiBackgroundOpacity')
    expect(shortcuts).toContain('decreaseZeroUiBackgroundOpacity')
    expect(main).toContain("sendOpacityAdjust('zeroUiBackground', 0.01)")
    expect(main).toContain("sendOpacityAdjust('zeroUiBackground', -0.01)")
  })
})
