import { describe, expect, it } from 'vitest'
import {
  getShortcutAccelerator,
  getShortcutAcceleratorDisplay,
  isModifierKey
} from '../src/renderer/src/lib/utils/keyboard'

// setup-navigator.ts forces isMac = true for these assertions.

type FakeEvent = {
  code: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  getModifierState?: (key: string) => boolean
}

function evt(e: FakeEvent): KeyboardEvent {
  return {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    getModifierState: () => false,
    ...e
  } as unknown as KeyboardEvent
}

describe('isModifierKey', () => {
  it('recognizes modifier codes', () => {
    expect(isModifierKey('ShiftLeft')).toBe(true)
    expect(isModifierKey('MetaRight')).toBe(true)
  })

  it('rejects normal keys', () => {
    expect(isModifierKey('KeyA')).toBe(false)
  })
})

describe('getShortcutAccelerator', () => {
  it('returns null for a bare modifier press', () => {
    expect(getShortcutAccelerator(evt({ code: 'ShiftLeft' }))).toBeNull()
  })

  it('returns null for unsupported keys', () => {
    expect(getShortcutAccelerator(evt({ code: 'IntlBackslash', ctrlKey: true }))).toBeNull()
  })

  it('returns null when no modifier is held', () => {
    expect(getShortcutAccelerator(evt({ code: 'KeyA' }))).toBeNull()
  })

  it('returns null for a supported non-modifier key with no modifier held', () => {
    expect(getShortcutAccelerator(evt({ code: 'ArrowUp' }))).toBeNull()
    expect(getShortcutAccelerator(evt({ code: 'Enter' }))).toBeNull()
  })

  it('maps a letter key with meta (mac) to CommandOrControl', () => {
    expect(getShortcutAccelerator(evt({ code: 'KeyS', metaKey: true }))).toBe('CommandOrControl+S')
  })

  it('maps ctrl on mac to Control rather than CommandOrControl', () => {
    expect(getShortcutAccelerator(evt({ code: 'KeyA', ctrlKey: true }))).toBe('Control+A')
  })

  it('strips the Key prefix and keeps the letter uppercased', () => {
    expect(getShortcutAccelerator(evt({ code: 'KeyZ', altKey: true }))).toBe('Alt+Z')
  })

  it('strips the Digit prefix', () => {
    expect(getShortcutAccelerator(evt({ code: 'Digit3', altKey: true }))).toBe('Alt+3')
  })

  it('leaves named keys without a prefix unchanged', () => {
    expect(getShortcutAccelerator(evt({ code: 'Enter', altKey: true }))).toBe('Alt+Enter')
    expect(getShortcutAccelerator(evt({ code: 'Tab', shiftKey: true }))).toBe('Shift+Tab')
    expect(getShortcutAccelerator(evt({ code: 'Space', metaKey: true }))).toBe(
      'CommandOrControl+Space'
    )
    expect(getShortcutAccelerator(evt({ code: 'Backspace', altKey: true }))).toBe('Alt+Backspace')
    expect(getShortcutAccelerator(evt({ code: 'Escape', altKey: true }))).toBe('Alt+Escape')
  })

  it('maps arrow codes to short names', () => {
    expect(getShortcutAccelerator(evt({ code: 'ArrowUp', altKey: true }))).toBe('Alt+Up')
  })

  it('maps all four arrow codes to short names', () => {
    expect(getShortcutAccelerator(evt({ code: 'ArrowDown', altKey: true }))).toBe('Alt+Down')
    expect(getShortcutAccelerator(evt({ code: 'ArrowLeft', altKey: true }))).toBe('Alt+Left')
    expect(getShortcutAccelerator(evt({ code: 'ArrowRight', altKey: true }))).toBe('Alt+Right')
  })

  it('maps punctuation codes to symbols', () => {
    expect(getShortcutAccelerator(evt({ code: 'Slash', shiftKey: true, altKey: true }))).toBe(
      'Alt+Shift+/'
    )
  })

  it('maps the remaining punctuation codes to their symbols', () => {
    expect(getShortcutAccelerator(evt({ code: 'Backquote', altKey: true }))).toBe('Alt+`')
    expect(getShortcutAccelerator(evt({ code: 'Minus', altKey: true }))).toBe('Alt+-')
    expect(getShortcutAccelerator(evt({ code: 'Equal', altKey: true }))).toBe('Alt+=')
    expect(getShortcutAccelerator(evt({ code: 'Backslash', altKey: true }))).toBe('Alt+\\')
    expect(getShortcutAccelerator(evt({ code: 'BracketLeft', altKey: true }))).toBe('Alt+[')
    expect(getShortcutAccelerator(evt({ code: 'BracketRight', altKey: true }))).toBe('Alt+]')
    expect(getShortcutAccelerator(evt({ code: 'Semicolon', altKey: true }))).toBe('Alt+;')
    expect(getShortcutAccelerator(evt({ code: 'Quote', altKey: true }))).toBe("Alt+'")
    expect(getShortcutAccelerator(evt({ code: 'Comma', altKey: true }))).toBe('Alt+,')
    expect(getShortcutAccelerator(evt({ code: 'Period', altKey: true }))).toBe('Alt+.')
  })

  it('orders modifiers as Control, Alt, Shift, Meta', () => {
    expect(
      getShortcutAccelerator(
        evt({ code: 'KeyK', ctrlKey: true, altKey: true, shiftKey: true, metaKey: true })
      )
    ).toBe('Control+Alt+Shift+CommandOrControl+K')
  })

  it('treats AltGraph as plain Alt and drops the phantom ctrl', () => {
    const accelerator = getShortcutAccelerator(
      evt({
        code: 'KeyP',
        ctrlKey: true,
        altKey: true,
        getModifierState: (key) => key === 'AltGraph'
      })
    )
    expect(accelerator).toBe('Alt+P')
  })

  it('tolerates a missing getModifierState (no AltGraph support)', () => {
    const accelerator = getShortcutAccelerator({
      code: 'KeyP',
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false
    } as unknown as KeyboardEvent)
    expect(accelerator).toBe('Control+Alt+P')
  })
})

describe('getShortcutAcceleratorDisplay', () => {
  it('renders mac glyphs for modifiers', () => {
    expect(getShortcutAcceleratorDisplay('CommandOrControl+S')).toBe('⌘+S')
    expect(getShortcutAcceleratorDisplay('Alt+Shift+/')).toBe('⌥+⇧+/')
  })

  it('renders the Control glyph for a leading Control modifier', () => {
    expect(getShortcutAcceleratorDisplay('Control+A')).toBe('⌃+A')
  })

  it('renders the Meta label for a Meta modifier', () => {
    expect(getShortcutAcceleratorDisplay('Meta+M')).toBe('Meta+M')
  })

  it('combines every modifier in order', () => {
    expect(getShortcutAcceleratorDisplay('Control+Alt+Shift+Meta+K')).toBe('⌃+⌥+⇧+Meta+K')
  })

  it('renders arrow glyphs', () => {
    expect(getShortcutAcceleratorDisplay('Alt+Up')).toBe('⌥+↑')
  })

  it('renders every arrow and the enter glyph', () => {
    expect(getShortcutAcceleratorDisplay('Alt+Down')).toBe('⌥+↓')
    expect(getShortcutAcceleratorDisplay('Alt+Left')).toBe('⌥+←')
    expect(getShortcutAcceleratorDisplay('Alt+Right')).toBe('⌥+→')
    expect(getShortcutAcceleratorDisplay('Alt+Enter')).toBe('⌥+↵')
  })

  it('leaves a plain key glyph unchanged', () => {
    expect(getShortcutAcceleratorDisplay('Alt+S')).toBe('⌥+S')
  })
})
