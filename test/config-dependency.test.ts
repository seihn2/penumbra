import { describe, expect, it } from 'vitest'
import {
  actionableControls,
  dependents,
  evaluateAll,
  evaluateControl,
  explain,
  isTruthy,
  type ControlSpec
} from '../src/shared/config-dependency'

describe('evaluateControl — missing-dependency', () => {
  it('flags translation as missing-dependency when apiKey is empty', () => {
    const spec: ControlSpec = { id: 'translation', requires: ['apiKey'] }
    expect(evaluateControl(spec, { apiKey: '' })).toBe('missing-dependency')
    expect(evaluateControl(spec, {})).toBe('missing-dependency')
  })

  it('is effective once apiKey is set', () => {
    const spec: ControlSpec = { id: 'translation', requires: ['apiKey'] }
    expect(evaluateControl(spec, { apiKey: 'sk-123' })).toBe('effective')
  })

  it('requires ALL listed dependencies to be truthy', () => {
    const spec: ControlSpec = { id: 'realtimeAssist', requires: ['apiKey', 'dashscopeApiKey'] }
    expect(evaluateControl(spec, { apiKey: 'sk', dashscopeApiKey: '' })).toBe('missing-dependency')
    expect(evaluateControl(spec, { apiKey: 'sk', dashscopeApiKey: 'ds' })).toBe('effective')
  })
})

describe('evaluateControl — precedence', () => {
  it('unsupported beats everything (highest precedence)', () => {
    const spec: ControlSpec = {
      id: 'gpuSpeakerMode',
      supported: false,
      requires: ['apiKey'],
      overriddenBy: 'customPrompt',
      sessionLocked: true,
      needsRestart: true
    }
    // Everything else would also fire, but unsupported wins.
    expect(
      evaluateControl(spec, { apiKey: 'sk', customPrompt: 'x' }, { sessionActive: true })
    ).toBe('unsupported')
  })

  it('overridden beats missing-dependency (documented order)', () => {
    const spec: ControlSpec = {
      id: 'defaultPrompt',
      requires: ['apiKey'],
      overriddenBy: 'customPrompt'
    }
    // apiKey is missing AND customPrompt is set — overridden takes precedence.
    expect(evaluateControl(spec, { customPrompt: 'my prompt' })).toBe('overridden')
  })

  it('does not report overridden when overriddenBy setting is falsy', () => {
    const spec: ControlSpec = { id: 'defaultPrompt', overriddenBy: 'customPrompt' }
    expect(evaluateControl(spec, { customPrompt: '' })).toBe('effective')
    expect(evaluateControl(spec, {})).toBe('effective')
  })

  it('missing-dependency beats session-locked and needs-restart', () => {
    const spec: ControlSpec = {
      id: 'asrLanguage',
      requires: ['dashscopeApiKey'],
      sessionLocked: true,
      needsRestart: true
    }
    expect(evaluateControl(spec, {}, { sessionActive: true })).toBe('missing-dependency')
  })

  it('session-locked beats needs-restart when session is active', () => {
    const spec: ControlSpec = { id: 'asrModel', sessionLocked: true, needsRestart: true }
    expect(evaluateControl(spec, {}, { sessionActive: true })).toBe('session-locked')
  })
})

describe('evaluateControl — session-locked', () => {
  it('is session-locked only while a session is active', () => {
    const spec: ControlSpec = { id: 'microphoneDeviceId', sessionLocked: true }
    expect(evaluateControl(spec, {}, { sessionActive: true })).toBe('session-locked')
  })

  it('is effective when the session is inactive', () => {
    const spec: ControlSpec = { id: 'microphoneDeviceId', sessionLocked: true }
    expect(evaluateControl(spec, {}, { sessionActive: false })).toBe('effective')
    expect(evaluateControl(spec, {})).toBe('effective')
  })
})

describe('evaluateControl — needs-restart', () => {
  it('reports needs-restart when deps met and nothing else blocks it', () => {
    const spec: ControlSpec = { id: 'asrModel', requires: ['dashscopeApiKey'], needsRestart: true }
    expect(evaluateControl(spec, { dashscopeApiKey: 'ds' })).toBe('needs-restart')
  })

  it('is effective for a plain control with no constraints', () => {
    expect(evaluateControl({ id: 'answerFontSize' }, {})).toBe('effective')
  })
})

describe('isTruthy', () => {
  it('treats undefined / null / false / empty string / 0 / NaN as false', () => {
    expect(isTruthy(undefined)).toBe(false)
    expect(isTruthy(null)).toBe(false)
    expect(isTruthy(false)).toBe(false)
    expect(isTruthy('')).toBe(false)
    expect(isTruthy(0)).toBe(false)
    expect(isTruthy(Number.NaN)).toBe(false)
  })

  it('treats non-empty strings / true / non-zero numbers / objects as true', () => {
    expect(isTruthy('sk-123')).toBe(true)
    expect(isTruthy(true)).toBe(true)
    expect(isTruthy(42)).toBe(true)
    expect(isTruthy(-1)).toBe(true)
    expect(isTruthy({})).toBe(true)
    expect(isTruthy([])).toBe(true)
  })
})

describe('evaluateAll', () => {
  const specs: ControlSpec[] = [
    { id: 'translation', requires: ['apiKey'] },
    { id: 'realtimeAssist', requires: ['apiKey', 'dashscopeApiKey'] },
    { id: 'defaultPrompt', overriddenBy: 'customPrompt' },
    { id: 'asrModel', sessionLocked: true, needsRestart: true },
    { id: 'gpuSpeakerMode', supported: false }
  ]

  it('maps every control to its status', () => {
    const map = evaluateAll(
      specs,
      { apiKey: 'sk', dashscopeApiKey: '', customPrompt: 'x' },
      { sessionActive: true }
    )
    expect(map).toEqual({
      translation: 'effective',
      realtimeAssist: 'missing-dependency',
      defaultPrompt: 'overridden',
      asrModel: 'session-locked',
      gpuSpeakerMode: 'unsupported'
    })
  })

  it('returns an empty map for no specs', () => {
    expect(evaluateAll([], {})).toEqual({})
  })
})

describe('explain', () => {
  it('is a stable passthrough of the status (i18n key === status)', () => {
    expect(explain('missing-dependency')).toBe('missing-dependency')
    expect(explain('effective')).toBe('effective')
    expect(explain('unsupported')).toBe('unsupported')
  })
})

describe('actionableControls', () => {
  it('lists only the ids the user can fix (missing-dependency)', () => {
    const map = {
      translation: 'missing-dependency' as const,
      realtimeAssist: 'missing-dependency' as const,
      asrModel: 'needs-restart' as const,
      gpuSpeakerMode: 'unsupported' as const,
      defaultPrompt: 'overridden' as const,
      answerFontSize: 'effective' as const
    }
    expect(actionableControls(map)).toEqual(['translation', 'realtimeAssist'])
  })

  it('returns an empty list when nothing is fixable', () => {
    expect(actionableControls({ a: 'effective', b: 'unsupported' })).toEqual([])
  })
})

describe('dependents', () => {
  const specs: ControlSpec[] = [
    { id: 'translation', requires: ['apiKey'] },
    { id: 'realtimeAssist', requires: ['apiKey', 'dashscopeApiKey'] },
    { id: 'asrModel', requires: ['dashscopeApiKey'] },
    { id: 'answerFontSize' }
  ]

  it('finds every control that requires the given setting', () => {
    expect(dependents(specs, 'apiKey')).toEqual(['translation', 'realtimeAssist'])
    expect(dependents(specs, 'dashscopeApiKey')).toEqual(['realtimeAssist', 'asrModel'])
  })

  it('returns an empty list when no control requires the setting', () => {
    expect(dependents(specs, 'nonexistent')).toEqual([])
  })
})

describe('purity / determinism', () => {
  it('produces identical output across repeated calls with the same input', () => {
    const spec: ControlSpec = { id: 'translation', requires: ['apiKey'] }
    const settings = { apiKey: '' }
    const first = evaluateControl(spec, settings)
    const second = evaluateControl(spec, settings)
    expect(first).toBe(second)
    expect(first).toBe('missing-dependency')
  })

  it('does not mutate its inputs', () => {
    const spec: ControlSpec = { id: 'translation', requires: ['apiKey'] }
    const settings = { apiKey: 'sk' }
    Object.freeze(spec)
    Object.freeze(settings)
    expect(() => evaluateControl(spec, settings)).not.toThrow()
    expect(() => evaluateAll([spec], settings)).not.toThrow()
  })
})
