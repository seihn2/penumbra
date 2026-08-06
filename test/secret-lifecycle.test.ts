import { describe, expect, it } from 'vitest'
import {
  applyReplace,
  beginReplace,
  cancelDelete,
  cancelReplace,
  confirmDelete,
  createSecretState,
  exposesRawToRenderer,
  interpretEmptyInput,
  isClearedInputADelete,
  markPendingDelete,
  maskSecret,
  type SecretPhase,
  type SecretState
} from '../src/shared/secret-lifecycle'

describe('createSecretState', () => {
  it("returns 'saved' with the suffix when a secret exists", () => {
    expect(createSecretState(true, '7F3A')).toEqual({ phase: 'saved', maskedSuffix: '7F3A' })
  })

  it("returns 'saved' with null suffix when hasSaved but no suffix given", () => {
    expect(createSecretState(true)).toEqual({ phase: 'saved', maskedSuffix: null })
  })

  it("returns 'unset' with null suffix when no secret exists", () => {
    expect(createSecretState(false)).toEqual({ phase: 'unset', maskedSuffix: null })
    expect(createSecretState(false, '7F3A')).toEqual({ phase: 'unset', maskedSuffix: null })
  })
})

describe('maskSecret', () => {
  it('returns the last 4 chars of a long secret', () => {
    expect(maskSecret('sk-abcdef7F3A')).toBe('7F3A')
  })

  it('returns the full string when shorter than 4', () => {
    expect(maskSecret('ab')).toBe('ab')
    expect(maskSecret('')).toBe('')
  })

  it('returns exactly 4 chars when the secret is length 4', () => {
    expect(maskSecret('7F3A')).toBe('7F3A')
  })
})

describe('replace flow', () => {
  it("beginReplace keeps the old suffix ('saved' -> 'replacing')", () => {
    const saved = createSecretState(true, '7F3A')
    expect(beginReplace(saved)).toEqual({ phase: 'replacing', maskedSuffix: '7F3A' })
  })

  it('applyReplace swaps to the new suffix and returns to saved', () => {
    const replacing = beginReplace(createSecretState(true, '7F3A'))
    expect(applyReplace(replacing, 'B92C')).toEqual({ phase: 'saved', maskedSuffix: 'B92C' })
  })

  it('cancelReplace restores the previous saved suffix', () => {
    const replacing = beginReplace(createSecretState(true, '7F3A'))
    expect(cancelReplace(replacing)).toEqual({ phase: 'saved', maskedSuffix: '7F3A' })
  })

  it("cancelReplace falls back to 'unset' when there was no prior suffix", () => {
    const replacing: SecretState = { phase: 'replacing', maskedSuffix: null }
    expect(cancelReplace(replacing)).toEqual({ phase: 'unset', maskedSuffix: null })
  })

  it('beginReplace is a no-op on phases other than saved', () => {
    const unset = createSecretState(false)
    expect(beginReplace(unset)).toEqual(unset)
  })
})

describe('delete flow', () => {
  it("markPendingDelete keeps the suffix ('saved' -> 'pending-delete')", () => {
    const saved = createSecretState(true, '7F3A')
    expect(markPendingDelete(saved)).toEqual({ phase: 'pending-delete', maskedSuffix: '7F3A' })
  })

  it("confirmDelete clears the suffix to null and returns 'unset'", () => {
    const pending = markPendingDelete(createSecretState(true, '7F3A'))
    expect(confirmDelete(pending)).toEqual({ phase: 'unset', maskedSuffix: null })
  })

  it("cancelDelete restores the 'saved' state with its suffix", () => {
    const pending = markPendingDelete(createSecretState(true, '7F3A'))
    expect(cancelDelete(pending)).toEqual({ phase: 'saved', maskedSuffix: '7F3A' })
  })

  it('confirmDelete is a no-op unless pending-delete', () => {
    const saved = createSecretState(true, '7F3A')
    expect(confirmDelete(saved)).toEqual(saved)
  })
})

describe('clearing input is not a delete', () => {
  it('isClearedInputADelete is always false', () => {
    expect(isClearedInputADelete()).toBe(false)
  })

  it('interpretEmptyInput never transitions to delete (phase unchanged)', () => {
    const phases: SecretPhase[] = ['unset', 'saved', 'replacing', 'pending-delete']
    for (const phase of phases) {
      expect(interpretEmptyInput(phase)).toBe(phase)
    }
  })
})

describe('raw secret is never exposed to the renderer', () => {
  it('exposesRawToRenderer is always false', () => {
    expect(exposesRawToRenderer()).toBe(false)
  })

  it('SecretState carries no raw/value/secret key', () => {
    const states: SecretState[] = [
      createSecretState(false),
      createSecretState(true, '7F3A'),
      beginReplace(createSecretState(true, '7F3A')),
      markPendingDelete(createSecretState(true, '7F3A'))
    ]
    for (const state of states) {
      const keys = Object.keys(state)
      expect(keys.sort()).toEqual(['maskedSuffix', 'phase'])
      expect(keys).not.toContain('raw')
      expect(keys).not.toContain('value')
      expect(keys).not.toContain('secret')
    }
  })
})

describe('purity — inputs are never mutated', () => {
  it('transition functions return new objects without touching the input', () => {
    const saved = createSecretState(true, '7F3A')
    const savedSnapshot = { ...saved }

    const replacing = beginReplace(saved)
    expect(saved).toEqual(savedSnapshot)

    const applied = applyReplace(replacing, 'B92C')
    expect(replacing).toEqual({ phase: 'replacing', maskedSuffix: '7F3A' })
    expect(applied).not.toBe(replacing)

    const pending = markPendingDelete(saved)
    const cleared = confirmDelete(pending)
    expect(pending).toEqual({ phase: 'pending-delete', maskedSuffix: '7F3A' })
    expect(cleared).not.toBe(pending)
  })
})
