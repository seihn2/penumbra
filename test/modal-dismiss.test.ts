import { describe, expect, it } from 'vitest'
import { shouldRestoreFocus } from '../src/renderer/src/coder/hooks/useModalDismiss'

// A minimal stand-in for a DOM Element — the helper only needs identity.
const el = (id: string): Element => ({ id }) as unknown as Element

describe('shouldRestoreFocus', () => {
  it('restores focus when the trigger is still attached', () => {
    const trigger = el('trigger')
    expect(shouldRestoreFocus(trigger, (n) => n === trigger)).toBe(true)
  })

  it('does not restore when there was no previously-focused element', () => {
    expect(shouldRestoreFocus(null, () => true)).toBe(false)
  })

  it('does not restore when the trigger was removed from the document', () => {
    const trigger = el('trigger')
    // contains() returns false → the node is detached, focusing it is pointless.
    expect(shouldRestoreFocus(trigger, () => false)).toBe(false)
  })
})
