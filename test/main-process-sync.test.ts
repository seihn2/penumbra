import { describe, expect, it } from 'vitest'
import {
  pickMainProcessSettings,
  getMainProcessHydrationPatch
} from '../src/renderer/src/lib/settings/main-process-sync'

describe('pickMainProcessSettings', () => {
  it('forwards main-process settings without exposing the answer-service key', () => {
    const picked = pickMainProcessSettings({
      apiBaseURL: 'https://api.example.com/v1',
      apiKey: 'sk-real-key',
      model: 'gpt-5-mini',
      answerApiProtocol: 'responses',
      dashscopeApiKey: 'sk-asr-key'
    })
    expect('apiKey' in picked).toBe(false)
    expect(picked.dashscopeApiKey).toBe('sk-asr-key')
    expect(picked.model).toBe('gpt-5-mini')
    expect(picked.answerApiProtocol).toBe('responses')
  })

  it('drops empty secrets so the write-back never wipes the stored key', () => {
    // The renderer store never holds secrets (they are not persisted nor
    // hydrated), so an empty secret means "not loaded", not "user cleared it".
    const picked = pickMainProcessSettings({
      apiKey: '',
      dashscopeApiKey: '',
      model: 'gpt-5-mini'
    })
    expect('apiKey' in picked).toBe(false)
    expect('dashscopeApiKey' in picked).toBe(false)
    expect(picked.model).toBe('gpt-5-mini')
  })

  it('still forwards empty non-secret values (e.g. cleared base URL)', () => {
    const picked = pickMainProcessSettings({ apiBaseURL: '', model: 'x' })
    expect(picked.apiBaseURL).toBe('')
  })

  it('forwards the native traffic-light setting', () => {
    expect(pickMainProcessSettings({ trafficLightMode: 'hover' }).trafficLightMode).toBe('hover')
  })

  it('skips undefined fields', () => {
    const picked = pickMainProcessSettings({ model: 'x' })
    expect('apiBaseURL' in picked).toBe(false)
  })
})

describe('getMainProcessHydrationPatch', () => {
  it('fills renderer-empty fields from the main process', () => {
    const patch = getMainProcessHydrationPatch(
      { model: 'gpt-5-mini', apiBaseURL: 'https://api.example.com/v1' },
      { model: '', apiBaseURL: '' }
    )
    expect(patch.model).toBe('gpt-5-mini')
    expect(patch.apiBaseURL).toBe('https://api.example.com/v1')
  })

  it('does not overwrite values the renderer already has', () => {
    const patch = getMainProcessHydrationPatch({ model: 'from-main' }, { model: 'from-renderer' })
    expect('model' in patch).toBe(false)
  })
})
