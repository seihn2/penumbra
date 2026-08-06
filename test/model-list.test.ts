import { describe, expect, it } from 'vitest'
import { extractModelIds } from '../src/shared/model-list'

describe('extractModelIds', () => {
  it('reads OpenAI-compatible data arrays', () => {
    expect(extractModelIds({ data: [{ id: 'gpt-b' }, { id: 'gpt-a' }] })).toEqual([
      'gpt-a',
      'gpt-b'
    ])
  })

  it('reads models arrays and strips Google model prefixes', () => {
    expect(
      extractModelIds({ models: [{ name: 'models/gemini-3.6-flash' }, { model: 'gemini-3.5' }] })
    ).toEqual(['gemini-3.5', 'gemini-3.6-flash'])
  })

  it('reads nested provider responses and dedupes ids', () => {
    expect(
      extractModelIds({
        result: { items: ['model-b', { model_id: 'model-a' }, { id: 'model-b' }] }
      })
    ).toEqual(['model-a', 'model-b'])
  })

  it('returns an empty list for unsupported payloads', () => {
    expect(extractModelIds({ ok: true })).toEqual([])
  })
})
