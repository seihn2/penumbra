import { describe, expect, it } from 'vitest'
import {
  computeFingerprint,
  isAllowedEndpoint,
  isHttps,
  mergeTestResult,
  normalizeOrigin,
  profilesEquivalent,
  setModelCache,
  shouldReauthorize,
  withFingerprint,
  type ProviderProfile
} from '../src/shared/provider-profile'

function makeProfile(overrides: Partial<ProviderProfile> = {}): ProviderProfile {
  const base: ProviderProfile = {
    id: 'p1',
    endpoint: 'https://api.openai.com/v1',
    credentialRef: 'cred-1',
    model: 'gpt-5-mini',
    fingerprint: ''
  }
  const merged = { ...base, ...overrides }
  return { ...merged, fingerprint: computeFingerprint(merged) }
}

describe('normalizeOrigin', () => {
  it('lowercases host and strips trailing slashes', () => {
    expect(normalizeOrigin('https://API.OpenAI.com/v1/')).toBe('https://api.openai.com/v1')
  })

  it('treats superficially different URLs with the same origin as equal', () => {
    const a = normalizeOrigin('HTTPS://Api.OpenAI.Com/v1/')
    const b = normalizeOrigin('https://api.openai.com/v1')
    expect(a).toBe(b)
  })

  it('ignores query string and hash', () => {
    expect(normalizeOrigin('https://api.openai.com/v1?x=1#frag')).toBe('https://api.openai.com/v1')
  })

  it('drops an empty path to an empty string (no trailing slash)', () => {
    expect(normalizeOrigin('https://api.openai.com/')).toBe('https://api.openai.com')
  })
})

describe('isHttps / isAllowedEndpoint', () => {
  it('accepts https endpoints', () => {
    expect(isHttps('https://api.openai.com')).toBe(true)
    expect(isAllowedEndpoint('https://api.openai.com')).toBe(true)
  })

  it('rejects plain http for a remote host', () => {
    expect(isHttps('http://api.openai.com')).toBe(false)
    expect(isAllowedEndpoint('http://api.openai.com')).toBe(false)
  })

  it('allows http://localhost and http://127.0.0.1 for local dev', () => {
    expect(isAllowedEndpoint('http://localhost:11434/v1')).toBe(true)
    expect(isAllowedEndpoint('http://127.0.0.1:8080')).toBe(true)
  })

  it('rejects invalid endpoints', () => {
    expect(isAllowedEndpoint('not a url')).toBe(false)
    expect(isHttps('not a url')).toBe(false)
  })
})

describe('computeFingerprint', () => {
  it('is stable across repeated calls', () => {
    const profile = makeProfile()
    expect(computeFingerprint(profile)).toBe(computeFingerprint(profile))
  })

  it('changes when the endpoint changes', () => {
    const a = makeProfile()
    const b = makeProfile({ endpoint: 'https://other.example.com/v1' })
    expect(computeFingerprint(a)).not.toBe(computeFingerprint(b))
  })

  it('changes when the model changes', () => {
    const a = makeProfile()
    const b = makeProfile({ model: 'gpt-5' })
    expect(computeFingerprint(a)).not.toBe(computeFingerprint(b))
  })

  it('changes when the credentialRef changes', () => {
    const a = makeProfile()
    const b = makeProfile({ credentialRef: 'cred-2' })
    expect(computeFingerprint(a)).not.toBe(computeFingerprint(b))
  })

  it('is unaffected by modelCache and lastTest', () => {
    const a = makeProfile()
    const b = makeProfile({
      modelCache: ['gpt-5', 'gpt-5-mini'],
      lastTest: { ok: true, at: 123 }
    })
    expect(computeFingerprint(a)).toBe(computeFingerprint(b))
  })

  it('is unaffected by header ordering', () => {
    const a = makeProfile({ headers: { 'X-A': '1', 'X-B': '2' } })
    const b = makeProfile({ headers: { 'X-B': '2', 'X-A': '1' } })
    expect(computeFingerprint(a)).toBe(computeFingerprint(b))
  })
})

describe('profilesEquivalent', () => {
  it('is true for same identity, false for different identity', () => {
    expect(profilesEquivalent(makeProfile(), makeProfile({ id: 'other' }))).toBe(true)
    expect(profilesEquivalent(makeProfile(), makeProfile({ model: 'gpt-5' }))).toBe(false)
  })
})

describe('shouldReauthorize', () => {
  it('is true when the normalized origin changes', () => {
    const oldP = makeProfile()
    const newP = makeProfile({ endpoint: 'https://api.deepseek.com/v1' })
    expect(shouldReauthorize(oldP, newP)).toBe(true)
  })

  it('is false when only case / trailing slash differ (same origin)', () => {
    const oldP = makeProfile({ endpoint: 'https://api.openai.com/v1' })
    const newP = makeProfile({ endpoint: 'HTTPS://API.OpenAI.com/v1/' })
    expect(shouldReauthorize(oldP, newP)).toBe(false)
  })

  it('is false when only the model changes on the same origin', () => {
    const oldP = makeProfile()
    const newP = makeProfile({ model: 'gpt-5' })
    expect(shouldReauthorize(oldP, newP)).toBe(false)
  })
})

describe('mergeTestResult', () => {
  it('records the test result without mutating the input', () => {
    const profile = makeProfile()
    const next = mergeTestResult(profile, { ok: true, at: 1000 })
    expect(next.lastTest).toEqual({ ok: true, at: 1000 })
    expect(profile.lastTest).toBeUndefined()
    expect(next).not.toBe(profile)
  })

  it('keeps a previously-good modelCache when a failed test is recorded', () => {
    const good = setModelCache(makeProfile(), ['gpt-5', 'gpt-5-mini'])
    const failed = mergeTestResult(good, { ok: false, at: 2000, error: 'timeout' })
    expect(failed.modelCache).toEqual(['gpt-5', 'gpt-5-mini'])
    expect(failed.lastTest).toEqual({ ok: false, at: 2000, error: 'timeout' })
  })
})

describe('setModelCache', () => {
  it('replaces the model cache without mutating the input', () => {
    const profile = makeProfile()
    const next = setModelCache(profile, ['a', 'b'])
    expect(next.modelCache).toEqual(['a', 'b'])
    expect(profile.modelCache).toBeUndefined()
    expect(next).not.toBe(profile)
  })

  it('copies the models array so later external mutation does not leak in', () => {
    const models = ['a', 'b']
    const next = setModelCache(makeProfile(), models)
    models.push('c')
    expect(next.modelCache).toEqual(['a', 'b'])
  })
})

describe('withFingerprint', () => {
  it('recomputes the fingerprint from current identity fields', () => {
    const stale = { ...makeProfile(), fingerprint: 'stale' }
    const fixed = withFingerprint(stale)
    expect(fixed.fingerprint).toBe(computeFingerprint(stale))
    expect(fixed.fingerprint).not.toBe('stale')
  })
})
