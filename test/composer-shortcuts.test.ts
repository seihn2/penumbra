import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(__dirname, `../${path}`), 'utf8')
}

describe('keyboard-first conversation shortcuts', () => {
  it('registers new-conversation and composer-focus actions', () => {
    const main = source('src/main/shortcuts.ts')
    const shortcuts = source('src/renderer/src/lib/store/shortcuts.ts')

    expect(main).toContain('newConversation: () =>')
    expect(main).toContain('focusComposer: () =>')
    expect(shortcuts).toContain('key: `${platformAlt}+Shift+N`')
    expect(shortcuts).toContain('key: `${platformAlt}+I`')
  })

  it('reveals the window, releases passthrough, and requests composer focus', () => {
    const main = source('src/main/shortcuts.ts')
    const windowController = source('src/main/services/window-controller.ts')

    expect(main).toContain('setMousePassthrough(false)')
    expect(main).toContain('revealWindowForKeyboardInput(mainWindow)')
    expect(main).toContain("webContents.send('focus-chat-composer', { resetConversation })")
    expect(windowController).toContain('export function revealWindowForKeyboardInput')
    expect(windowController).toContain('app.focus({ steal: true })')
    expect(windowController).toContain('window.focus()')
  })

  it('navigates home and focuses the real textarea after the event', () => {
    const app = source('src/renderer/src/App.tsx')
    const composer = source('src/renderer/src/coder/ChatComposer.tsx')

    expect(app).toContain('window.api.onFocusChatComposer(({ resetConversation }) =>')
    expect(app).toContain("if (location.pathname !== '/') navigate('/')")
    expect(app).toContain('useChatStore.getState().clear()')
    expect(app).toContain('requestFocus(resetConversation)')
    expect(composer).toContain("if (focusRequest.clearDraft) setValue('')")
    expect(composer).toContain('input.focus({ preventScroll: false })')
    expect(composer).toContain('data-chat-composer="true"')
  })

  it('includes labels for both shortcuts in every locale', () => {
    for (const locale of ['zh', 'en', 'ja', 'ko', 'fr']) {
      const translations = source(`src/renderer/src/lib/i18n/locales/${locale}.ts`)
      expect(translations).toContain('newConversation:')
      expect(translations).toContain('focusComposer:')
    }
  })
})
