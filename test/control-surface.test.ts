import { describe, expect, it } from 'vitest'
import {
  controlsForSurface,
  hasControlCenter,
  surfaceOf,
  type ControlContext,
  type ControlId
} from '../src/shared/control-surface'

const MAC_WITH_CHAT: ControlContext = { hasConversation: true, isMac: true }
const WIN_NO_CHAT: ControlContext = { hasConversation: false, isMac: false }

describe('controlsForSurface', () => {
  it('keeps live-critical actions on the overlay', () => {
    const overlay = controlsForSurface('overlay', MAC_WITH_CHAT)
    expect(overlay).toContain('transcription')
    expect(overlay).toContain('new-conversation')
    expect(overlay).toContain('history')
  })

  it('folds setup tools into the control center', () => {
    const center = controlsForSurface('center', MAC_WITH_CHAT)
    expect(center).toEqual(['mock', 'brief', 'self-check', 'settings', 'help'])
  })

  it('hides export until there is a conversation', () => {
    expect(controlsForSurface('overlay', { hasConversation: false, isMac: true })).not.toContain(
      'export'
    )
    expect(controlsForSurface('overlay', MAC_WITH_CHAT)).toContain('export')
  })

  it('shows the window-close button only off macOS', () => {
    expect(controlsForSurface('overlay', MAC_WITH_CHAT)).not.toContain('close')
    expect(controlsForSurface('overlay', WIN_NO_CHAT)).toContain('close')
  })

  it('preserves declaration order within a surface', () => {
    const overlay = controlsForSurface('overlay', WIN_NO_CHAT)
    // no conversation → no export; order otherwise stable
    expect(overlay).toEqual(['transcription', 'new-conversation', 'history', 'close'])
  })

  it('never places a control in both surfaces', () => {
    const overlay = new Set(controlsForSurface('overlay', MAC_WITH_CHAT))
    const center = controlsForSurface('center', MAC_WITH_CHAT)
    for (const id of center) expect(overlay.has(id)).toBe(false)
  })

  it('partitions every visible control into exactly one surface', () => {
    const all: ControlId[] = [
      'transcription',
      'export',
      'new-conversation',
      'history',
      'mock',
      'brief',
      'self-check',
      'settings',
      'help',
      'close'
    ]
    const overlay = controlsForSurface('overlay', WIN_NO_CHAT)
    const center = controlsForSurface('center', WIN_NO_CHAT)
    const seen = new Set([...overlay, ...center])
    // export is hidden (no conversation); everything else appears once.
    for (const id of all) {
      if (id === 'export') expect(seen.has(id)).toBe(false)
      else expect(seen.has(id)).toBe(true)
    }
  })
})

describe('surfaceOf', () => {
  it('returns the declared home surface', () => {
    expect(surfaceOf('transcription')).toBe('overlay')
    expect(surfaceOf('settings')).toBe('center')
  })

  it('throws on an unknown id', () => {
    expect(() => surfaceOf('nope' as ControlId)).toThrow()
  })
})

describe('hasControlCenter', () => {
  it('is true whenever the center has entries', () => {
    expect(hasControlCenter(WIN_NO_CHAT)).toBe(true)
  })
})
