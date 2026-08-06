import { describe, expect, it } from 'vitest'
import {
  buildModelOptions,
  dedupeFetchedModels,
  defaultModelOptions
} from '../src/renderer/src/settings/model-options'

describe('buildModelOptions', () => {
  it('shows common models before custom entries', () => {
    const options = buildModelOptions(['my-model'])
    expect(options[0]).toMatchObject({ source: 'common', isCustom: false })
    expect(options.at(-1)).toEqual({
      value: 'my-model',
      label: 'my-model',
      isCustom: true,
      source: 'custom'
    })
    expect(options).toHaveLength(defaultModelOptions.length + 1)
  })

  it('dedupes a custom model that duplicates a built-in (common wins)', () => {
    const builtinValue = defaultModelOptions[0].value
    const options = buildModelOptions([builtinValue])
    const matches = options.filter((o) => o.value === builtinValue)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ isCustom: false, source: 'common' })
  })

  it('dedupes repeated custom entries', () => {
    const options = buildModelOptions(['dup', 'dup'])
    expect(options.filter((o) => o.value === 'dup')).toHaveLength(1)
  })

  it('returns only built-ins when no custom models', () => {
    expect(buildModelOptions([])).toEqual(defaultModelOptions)
  })

  it('uses common models for the selected provider', () => {
    const options = buildModelOptions([], 'https://api.deepseek.com/v1')
    expect(options.map((option) => option.value)).toEqual(['deepseek-v4-pro', 'deepseek-v4-flash'])
  })

  it('groups account models after common models and before custom models', () => {
    const options = buildModelOptions(['manual-model'], 'https://api.deepseek.com/v1', [
      'deepseek-v4-pro',
      'account-model'
    ])
    expect(options.map((option) => [option.value, option.source])).toEqual([
      ['deepseek-v4-pro', 'common'],
      ['deepseek-v4-flash', 'common'],
      ['account-model', 'account'],
      ['manual-model', 'custom']
    ])
  })

  it('trims and removes blank persisted custom models', () => {
    const options = buildModelOptions([' custom-model ', '', '   '])
    expect(options.at(-1)).toMatchObject({ value: 'custom-model', source: 'custom' })
    expect(options.some((option) => option.value === '')).toBe(false)
  })
})

describe('dedupeFetchedModels', () => {
  it('keeps only ids not already known', () => {
    expect(dedupeFetchedModels(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c'])
  })

  it('trims and drops empty/whitespace ids', () => {
    expect(dedupeFetchedModels([' a ', '', '   ', 'b'], [])).toEqual(['a', 'b'])
  })

  it('dedupes repeated ids within the fetched list', () => {
    expect(dedupeFetchedModels(['x', 'x', 'y'], [])).toEqual(['x', 'y'])
  })

  it('returns empty when every fetched id is already known', () => {
    expect(dedupeFetchedModels(['a', 'b'], ['a', 'b'])).toEqual([])
  })

  it('treats a trimmed id as matching a known id', () => {
    expect(dedupeFetchedModels([' gpt-5-mini '], ['gpt-5-mini'])).toEqual([])
  })
})
