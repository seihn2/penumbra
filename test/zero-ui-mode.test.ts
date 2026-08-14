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

  it('keeps normal screenshots as compact thumbnails', () => {
    const css = readRenderer('assets/main.css')
    expect(css).toContain('width: min(112px, 32vw)')
    expect(css).toContain('aspect-ratio: 16 / 10')
  })

  it('adapts output contrast independently for light and dark content behind it', () => {
    const css = readRenderer('assets/main.css')
    const effects = readRenderer('hooks/useAppearanceEffects.ts')
    expect(css).toContain("html[data-zero-ui-backdrop='light'] .zero-ui-output")
    expect(css).toContain("html[data-zero-ui-backdrop='dark'] .zero-ui-output")
    expect(css).toContain('background: rgba(255, 255, 255, 0.48)')
    expect(css).toContain('background: rgba(3, 7, 12, 0.34)')
    expect(effects).toContain('document.documentElement.dataset.zeroUiBackdrop = zeroUiBackdrop')
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
  })
})
