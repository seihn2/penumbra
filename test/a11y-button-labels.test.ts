import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Accessibility guard (P1#33 / WCAG 4.1.2): an icon-only button must expose an
// accessible name. `title` is NOT reliably used as the accessible name by
// screen readers, so any <button>/<Button> that sets `title` must also set
// `aria-label` (or carry visible text — but we require aria-label uniformly so
// the rule is mechanical and can't silently rot).
//
// This scans the WHOLE renderer tree, not a hand-picked file list, so a new
// icon button anywhere in the UI can't ship unlabeled.

const RENDERER = resolve(__dirname, '..', 'src/renderer/src')

function tsxFiles(dir: string): string[] {
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) out = out.concat(tsxFiles(p))
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

// Each <button>/<Button>…</button> element whose opening tag has `title=` but
// not `aria-label=`. Returns "path:line" locations.
function offenders(file: string): string[] {
  const src = readFileSync(file, 'utf8')
  const re = /<(button|Button)\b([\s\S]*?)>([\s\S]*?)<\/\1>/g
  const hits: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const openTag = m[2]
    if (/\btitle=/.test(openTag) && !/\baria-label=/.test(openTag)) {
      const line = src.slice(0, m.index).split('\n').length
      hits.push(`${file.slice(RENDERER.length + 1)}:${line}`)
    }
  }
  return hits
}

describe('icon button accessible names (whole renderer)', () => {
  it('no title-bearing button lacks an aria-label anywhere in the renderer', () => {
    const all = tsxFiles(RENDERER).flatMap(offenders)
    expect(all).toEqual([])
  })
})

// A custom overlay (a `fixed inset-0` backdrop, i.e. not the shadcn Dialog which
// already sets these) must mark its content as a modal dialog with an
// accessible name, so a screen reader announces it and traps context (WCAG
// 4.1.2 / dialog pattern). We check the file declares role="dialog",
// aria-modal, and an aria-label.
function modalFilesMissingDialogSemantics(): string[] {
  const bad: string[] = []
  for (const file of tsxFiles(RENDERER)) {
    if (file.endsWith(join('components', 'ui', 'dialog.tsx'))) continue
    const src = readFileSync(file, 'utf8')
    if (!src.includes('fixed inset-0')) continue
    const hasRole = /role="dialog"/.test(src)
    const hasModal = /aria-modal="true"/.test(src)
    const hasLabel = /aria-label(?:ledby)?=/.test(src)
    if (!(hasRole && hasModal && hasLabel)) bad.push(file.slice(RENDERER.length + 1))
  }
  return bad
}

describe('custom modal dialog semantics', () => {
  it('every custom overlay declares role=dialog + aria-modal + a label', () => {
    expect(modalFilesMissingDialogSemantics()).toEqual([])
  })
})

// Keyboard operability (WCAG 2.1.2): a custom overlay must be dismissible from
// the keyboard, not only by clicking the close button. We require each overlay
// file to use the shared useModalDismiss hook (Escape-to-close).
function modalFilesMissingKeyboardDismiss(): string[] {
  const bad: string[] = []
  for (const file of tsxFiles(RENDERER)) {
    if (file.endsWith(join('components', 'ui', 'dialog.tsx'))) continue
    const src = readFileSync(file, 'utf8')
    if (!src.includes('fixed inset-0')) continue
    if (!/useModalDismiss/.test(src)) bad.push(file.slice(RENDERER.length + 1))
  }
  return bad
}

describe('custom modal keyboard dismiss', () => {
  it('every custom overlay wires Escape-to-close via useModalDismiss', () => {
    expect(modalFilesMissingKeyboardDismiss()).toEqual([])
  })
})

// Landmark structure (WCAG 1.3.1): a screen-reader user navigates by landmarks.
// The app shell must expose a banner (header) and a main region so the header
// controls and the content are both reachable by landmark jumps.
describe('app shell landmarks', () => {
  it('AppHeader is a banner landmark with a labelled toolbar', () => {
    const src = readFileSync(resolve(RENDERER, 'coder/AppHeader.tsx'), 'utf8')
    expect(src).toMatch(/role="banner"/)
    expect(src).toMatch(/role="toolbar"/)
  })

  it('AppContent exposes a main landmark and a log region for the chat', () => {
    const src = readFileSync(resolve(RENDERER, 'coder/AppContent.tsx'), 'utf8')
    expect(src).toMatch(/<main\b/)
    expect(src).toMatch(/role="log"/)
  })
})
