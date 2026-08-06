import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROMPT_PRESET,
  PROMPT_PRESET_IDS,
  isPromptPresetId,
  promptPresetInstruction
} from '../src/shared/prompt-presets'

describe('PROMPT_PRESET_IDS', () => {
  it('contains exactly the four known presets', () => {
    expect(PROMPT_PRESET_IDS).toEqual(['default', 'concise', 'codeOnly', 'interview'])
  })

  it('has no duplicate ids', () => {
    expect(new Set(PROMPT_PRESET_IDS).size).toBe(PROMPT_PRESET_IDS.length)
  })
})

describe('DEFAULT_PROMPT_PRESET', () => {
  it('is a valid preset id', () => {
    expect(isPromptPresetId(DEFAULT_PROMPT_PRESET)).toBe(true)
  })

  it('is the default preset', () => {
    expect(DEFAULT_PROMPT_PRESET).toBe('default')
  })
})

describe('promptPresetInstruction', () => {
  it('has an entry for every preset id', () => {
    for (const id of PROMPT_PRESET_IDS) {
      expect(promptPresetInstruction).toHaveProperty(id)
    }
  })

  it('has exactly one entry per preset and no extras', () => {
    expect(Object.keys(promptPresetInstruction).sort()).toEqual([...PROMPT_PRESET_IDS].sort())
  })

  it('leaves the default preset instruction empty', () => {
    expect(promptPresetInstruction.default).toBe('')
  })

  it('provides a non-empty instruction for every non-default preset', () => {
    for (const id of PROMPT_PRESET_IDS) {
      if (id === 'default') continue
      expect(promptPresetInstruction[id].trim().length).toBeGreaterThan(0)
    }
  })
})

describe('isPromptPresetId', () => {
  it('accepts every known preset id', () => {
    for (const id of PROMPT_PRESET_IDS) {
      expect(isPromptPresetId(id)).toBe(true)
    }
  })

  it('rejects an unknown string', () => {
    expect(isPromptPresetId('verbose')).toBe(false)
    expect(isPromptPresetId('')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isPromptPresetId(undefined)).toBe(false)
    expect(isPromptPresetId(null)).toBe(false)
    expect(isPromptPresetId(0)).toBe(false)
    expect(isPromptPresetId({})).toBe(false)
    expect(isPromptPresetId(['default'])).toBe(false)
  })
})
