import { describe, expect, it } from 'vitest'
import {
  migratePersistedSettings,
  sanitizePersistedSettings
} from '../src/renderer/src/lib/store/settings'
import { DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF } from '../src/shared/answer-service-profile'

describe('sanitizePersistedSettings', () => {
  it('returns defaults for null / non-object', () => {
    expect(sanitizePersistedSettings(null).uiLanguage).toBe('zh')
    expect(sanitizePersistedSettings('garbage').opacity).toBe(0.8)
    expect(sanitizePersistedSettings('garbage').iconOpacity).toBe(1)
    expect(sanitizePersistedSettings('garbage').uiFontSize).toBe(16)
    expect(sanitizePersistedSettings('garbage').codeBlockTheme).toBe('soft')
    expect(sanitizePersistedSettings('garbage').trafficLightMode).toBe('hover')
    expect(sanitizePersistedSettings(undefined).apiBaseURL).toBe('')
    expect(sanitizePersistedSettings(undefined).answerApiProtocol).toBe('auto')
  })

  it('keeps valid persisted values', () => {
    const out = sanitizePersistedSettings({
      apiBaseURL: 'https://x/v1',
      answerApiProtocol: 'responses',
      opacity: 0,
      iconOpacity: 0.35
    })
    expect(out.apiBaseURL).toBe('https://x/v1')
    expect(out.answerApiProtocol).toBe('responses')
    expect(out.opacity).toBe(0)
    expect(out.iconOpacity).toBe(0.35)
  })

  it('drops values whose type does not match the default', () => {
    const out = sanitizePersistedSettings({ opacity: 'not-a-number', overallOpacity: null })
    expect(out.opacity).toBe(0.8) // fell back to default
    expect(out.overallOpacity).toBe(1)
  })

  it('clamps persisted opacity channels to their safe ranges', () => {
    const out = sanitizePersistedSettings({
      overallOpacity: -1,
      opacity: -1,
      textOpacity: 0,
      iconOpacity: 4
    })
    expect(out.overallOpacity).toBe(0.2)
    expect(out.opacity).toBe(0)
    expect(out.textOpacity).toBe(0.2)
    expect(out.iconOpacity).toBe(1)
  })

  it('clamps persisted font sizes to their supported ranges', () => {
    const out = sanitizePersistedSettings({ uiFontSize: 100, answerFontSize: 1 })
    expect(out.uiFontSize).toBe(20)
    expect(out.answerFontSize).toBe(12)
  })

  it('ignores unknown keys', () => {
    const out = sanitizePersistedSettings({ bogusKey: 123, model: 'gpt-5-mini' })
    expect('bogusKey' in out).toBe(false)
    expect(out.model).toBe('gpt-5-mini')
  })

  it('keeps customModels only when it is an array', () => {
    expect(sanitizePersistedSettings({ customModels: ['a', 'b'] }).customModels).toEqual(['a', 'b'])
    // a non-array object must not slip through (typeof {} === 'object')
    expect(sanitizePersistedSettings({ customModels: { 0: 'x' } }).customModels).toEqual([])
  })

  it('always returns a complete settings object', () => {
    const out = sanitizePersistedSettings({})
    expect(out.uiLanguage).toBe('zh')
    expect(out.asrModel).toBe('qwen-audio-3.0-asr-flash-streaming')
    expect(out.contentProtectionEnabled).toBe(true)
    expect(out.codeBlockTheme).toBe('soft')
    expect(out.trafficLightMode).toBe('hover')
  })

  it('sanitizes appearance enums and migrates the legacy traffic-light switch', () => {
    expect(
      sanitizePersistedSettings({ codeBlockTheme: 'neon', trafficLightMode: 'sometimes' })
        .codeBlockTheme
    ).toBe('soft')
    expect(sanitizePersistedSettings({ trafficLightMode: 'sometimes' }).trafficLightMode).toBe(
      'hover'
    )
    expect(migratePersistedSettings({ hideTrafficLights: true }, 19).trafficLightMode).toBe(
      'hidden'
    )
    expect(migratePersistedSettings({ hideTrafficLights: false }, 19).trafficLightMode).toBe(
      'hover'
    )
  })

  it('migrates v17 endpoint/model settings into the default answer-service profile', () => {
    const out = migratePersistedSettings(
      {
        apiBaseURL: 'https://api.example.com/v1',
        model: 'model-a'
      },
      17
    )

    expect(out.answerServiceProfiles).toHaveLength(1)
    expect(out.answerServiceProfiles[0]).toMatchObject({
      endpoint: 'https://api.example.com/v1',
      model: 'model-a',
      protocol: 'auto',
      credentialRef: DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF
    })
    expect(out.activeAnswerServiceProfileId).toBe(out.answerServiceProfiles[0].id)
  })
})
