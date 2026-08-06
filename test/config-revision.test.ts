import { describe, expect, it } from 'vitest'
import {
  applyDraft,
  createActiveConfig,
  discardDraft,
  editDraft,
  effectTimingFor,
  startDraft,
  validateDraft,
  type Validator
} from '../src/shared/config-revision'

const nonEmpty: Validator = (v) =>
  typeof v === 'string' && v.trim().length > 0 ? null : 'must not be empty'

const positive: Validator = (v) => (typeof v === 'number' && v > 0 ? null : 'must be positive')

describe('createActiveConfig', () => {
  it('defaults revision to 0 and copies the values map', () => {
    const values = { model: 'gpt-5-mini' }
    const active = createActiveConfig(values)
    expect(active.revision).toBe(0)
    expect(active.values).toEqual({ model: 'gpt-5-mini' })
    // mutating the caller's object must not leak into the config
    values.model = 'changed'
    expect(active.values.model).toBe('gpt-5-mini')
  })

  it('honors an explicit revision', () => {
    expect(createActiveConfig({}, 7).revision).toBe(7)
  })
})

describe('startDraft', () => {
  it('produces an empty edit set based on the active config', () => {
    const active = createActiveConfig({ model: 'a' }, 3)
    const draft = startDraft(active)
    expect(draft.edits).toEqual({})
    expect(draft.base).toBe(active)
  })
})

describe('editDraft', () => {
  it('records an edit without touching the active config values or revision', () => {
    const active = createActiveConfig({ model: 'a', temp: 0.5 }, 2)
    const draft = editDraft(startDraft(active), 'model', 'b')
    expect(draft.edits).toEqual({ model: 'b' })
    // active is unchanged — draft edits never mutate the applied truth
    expect(active.values).toEqual({ model: 'a', temp: 0.5 })
    expect(active.revision).toBe(2)
  })

  it('does not mutate the input draft (returns a new one)', () => {
    const active = createActiveConfig({ model: 'a' })
    const first = startDraft(active)
    const second = editDraft(first, 'model', 'b')
    expect(first.edits).toEqual({})
    expect(second.edits).toEqual({ model: 'b' })
    expect(second).not.toBe(first)
  })

  it('accumulates multiple edits across calls', () => {
    const active = createActiveConfig({ model: 'a', temp: 0.1 })
    let draft = startDraft(active)
    draft = editDraft(draft, 'model', 'b')
    draft = editDraft(draft, 'temp', 0.9)
    expect(draft.edits).toEqual({ model: 'b', temp: 0.9 })
  })
})

describe('validateDraft', () => {
  it('passes when every field is valid', () => {
    const active = createActiveConfig({ model: 'a', temp: 1 })
    const result = validateDraft(startDraft(active), { model: nonEmpty, temp: positive })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.values).toEqual({ model: 'a', temp: 1 })
  })

  it('collects ALL field errors, not just the first', () => {
    const active = createActiveConfig({ model: '', temp: -1 })
    const result = validateDraft(startDraft(active), { model: nonEmpty, temp: positive })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(2)
      expect(result.errors.map((e) => e.field).sort()).toEqual(['model', 'temp'])
    }
  })

  it('validates the merged (edited) value, not the base value', () => {
    const active = createActiveConfig({ model: '' })
    const draft = editDraft(startDraft(active), 'model', 'filled')
    const result = validateDraft(draft, { model: nonEmpty })
    expect(result.ok).toBe(true)
  })
})

describe('applyDraft', () => {
  it('bumps revision by exactly 1 and merges edits when all valid', () => {
    const active = createActiveConfig({ model: 'a', temp: 1 }, 4)
    const draft = editDraft(startDraft(active), 'model', 'b')
    const result = applyDraft(active, draft, { model: nonEmpty, temp: positive })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.revision).toBe(5)
      expect(result.config.values).toEqual({ model: 'b', temp: 1 })
    }
  })

  it('applies NOTHING and returns all errors when one field is invalid (atomic)', () => {
    const active = createActiveConfig({ model: 'a', temp: 1 }, 4)
    // edit one field to something invalid and leave another already-invalid base value
    const draft = editDraft(editDraft(startDraft(active), 'model', ''), 'temp', -3)
    const result = applyDraft(active, draft, { model: nonEmpty, temp: positive })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toHaveLength(2)
    // active config is completely unchanged after a failed apply
    expect(active.revision).toBe(4)
    expect(active.values).toEqual({ model: 'a', temp: 1 })
  })

  it('does not mutate the active config or draft on success', () => {
    const active = createActiveConfig({ model: 'a' }, 0)
    const draft = editDraft(startDraft(active), 'model', 'b')
    applyDraft(active, draft, { model: nonEmpty })
    expect(active.values).toEqual({ model: 'a' })
    expect(active.revision).toBe(0)
    expect(draft.edits).toEqual({ model: 'b' })
  })

  it('increments only from the active revision, not the number of edits', () => {
    const active = createActiveConfig({ a: 1, b: 2, c: 3 }, 10)
    let draft = startDraft(active)
    draft = editDraft(draft, 'a', 11)
    draft = editDraft(draft, 'b', 22)
    const result = applyDraft(active, draft, {})
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.revision).toBe(11)
  })
})

describe('discardDraft', () => {
  it('returns a fresh empty draft based on the active config', () => {
    const active = createActiveConfig({ model: 'a' }, 1)
    const dirty = editDraft(startDraft(active), 'model', 'b')
    const fresh = discardDraft(active)
    expect(dirty.edits).toEqual({ model: 'b' })
    expect(fresh.edits).toEqual({})
    expect(fresh.base).toBe(active)
  })
})

describe('effectTimingFor', () => {
  it('returns the declared timing for a field', () => {
    const map = { asrModel: 'restart-transcription' as const, model: 'next-request' as const }
    expect(effectTimingFor('asrModel', map)).toBe('restart-transcription')
    expect(effectTimingFor('model', map)).toBe('next-request')
  })

  it('falls back to immediate for an undeclared field', () => {
    expect(effectTimingFor('opacity', {})).toBe('immediate')
  })
})
