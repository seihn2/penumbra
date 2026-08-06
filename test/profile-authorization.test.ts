import { describe, expect, it } from 'vitest'
import {
  canSend,
  createAuthorization,
  disableForSession,
  enableForSession,
  fieldsForPurpose,
  onProfileOrOriginChange,
  setFieldGrant
} from '../src/shared/profile-authorization'

describe('createAuthorization', () => {
  it('creates an empty authorization with session enabled', () => {
    const auth = createAuthorization('p1', 'api.example.com')
    expect(auth.profileId).toBe('p1')
    expect(auth.modelOrigin).toBe('api.example.com')
    expect(auth.grants).toEqual([])
    expect(auth.sessionDisabled).toBe(false)
  })
})

describe('canSend defaults', () => {
  it('is false for an unknown field', () => {
    const auth = createAuthorization('p1', 'origin')
    expect(canSend(auth, 'name', 'screenshot-solve')).toBe(false)
  })

  it('is false for a field that exists but has no purpose granted', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: {} })
    expect(canSend(auth, 'name', 'screenshot-solve')).toBe(false)
  })

  it('is false for a purpose that is explicitly false', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': false } })
    expect(canSend(auth, 'name', 'screenshot-solve')).toBe(false)
  })

  it('is true only for the exact granted purpose (opt-in per purpose)', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    expect(canSend(auth, 'name', 'screenshot-solve')).toBe(true)
    expect(canSend(auth, 'name', 'realtime-assist')).toBe(false)
    expect(canSend(auth, 'name', 'proactive')).toBe(false)
    expect(canSend(auth, 'name', 'memory-distill')).toBe(false)
  })
})

describe('localOnly is a true never-send flag', () => {
  it('blocks canSend for ALL purposes even if a purpose flag is somehow true', () => {
    let auth = createAuthorization('p1', 'origin')
    // localOnly:true must override / clear any purpose flags.
    auth = setFieldGrant(auth, 'ssn', {
      localOnly: true,
      purposes: { 'screenshot-solve': true, 'realtime-assist': true }
    })
    expect(canSend(auth, 'ssn', 'screenshot-solve')).toBe(false)
    expect(canSend(auth, 'ssn', 'realtime-assist')).toBe(false)
    expect(canSend(auth, 'ssn', 'proactive')).toBe(false)
    expect(canSend(auth, 'ssn', 'memory-distill')).toBe(false)
  })

  it('clears stored purposes when localOnly is set', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'ssn', {
      localOnly: true,
      purposes: { 'screenshot-solve': true }
    })
    const grant = auth.grants.find((g) => g.field === 'ssn')
    expect(grant?.purposes).toEqual({})
  })
})

describe('sessionDisabled', () => {
  it('makes canSend false for everything, and re-enabling restores it', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    expect(canSend(auth, 'name', 'screenshot-solve')).toBe(true)

    const disabled = disableForSession(auth)
    expect(disabled.sessionDisabled).toBe(true)
    expect(canSend(disabled, 'name', 'screenshot-solve')).toBe(false)

    const reEnabled = enableForSession(disabled)
    expect(reEnabled.sessionDisabled).toBe(false)
    expect(canSend(reEnabled, 'name', 'screenshot-solve')).toBe(true)
  })
})

describe('avoidMention is distinct from localOnly', () => {
  it('does NOT block sending — a granted purpose still sends when avoidMention is true', () => {
    // avoidMention is a prompt hint ("please do not dwell on this"), NOT a
    // send-block. "Wish to avoid mentioning" is not the same as "won't send":
    // localOnly governs sending, avoidMention only shapes the prompt.
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'age', {
      avoidMention: true,
      purposes: { 'realtime-assist': true }
    })
    expect(canSend(auth, 'age', 'realtime-assist')).toBe(true)
    const grant = auth.grants.find((g) => g.field === 'age')
    expect(grant?.avoidMention).toBe(true)
  })
})

describe('setFieldGrant', () => {
  it('upserts: updating an existing field replaces it rather than duplicating', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    auth = setFieldGrant(auth, 'name', { purposes: { proactive: true } })
    expect(auth.grants.filter((g) => g.field === 'name')).toHaveLength(1)
    expect(canSend(auth, 'name', 'screenshot-solve')).toBe(false)
    expect(canSend(auth, 'name', 'proactive')).toBe(true)
  })

  it('does not mutate the input authorization (purity)', () => {
    const auth = createAuthorization('p1', 'origin')
    const before = JSON.stringify(auth)
    const next = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    expect(JSON.stringify(auth)).toBe(before)
    expect(auth.grants).toHaveLength(0)
    expect(next).not.toBe(auth)
    expect(next.grants).toHaveLength(1)
  })

  it('does not share the purposes object with the caller (defensive copy)', () => {
    const auth = createAuthorization('p1', 'origin')
    const purposes = { 'screenshot-solve': true }
    const next = setFieldGrant(auth, 'name', { purposes })
    purposes['screenshot-solve'] = false
    expect(canSend(next, 'name', 'screenshot-solve')).toBe(true)
  })
})

describe('fieldsForPurpose', () => {
  it('returns exactly the granted, sendable fields for the purpose', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    auth = setFieldGrant(auth, 'project', {
      purposes: { 'screenshot-solve': true, proactive: true }
    })
    auth = setFieldGrant(auth, 'ssn', { localOnly: true })
    auth = setFieldGrant(auth, 'age', { purposes: { 'realtime-assist': true } })

    expect(fieldsForPurpose(auth, 'screenshot-solve').sort()).toEqual(['name', 'project'])
    expect(fieldsForPurpose(auth, 'proactive')).toEqual(['project'])
    expect(fieldsForPurpose(auth, 'realtime-assist')).toEqual(['age'])
    expect(fieldsForPurpose(auth, 'memory-distill')).toEqual([])
  })

  it('returns nothing when the session is disabled', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    auth = disableForSession(auth)
    expect(fieldsForPurpose(auth, 'screenshot-solve')).toEqual([])
  })
})

describe('onProfileOrOriginChange invalidates prior authorization', () => {
  it('clears grants when the profileId changes', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    const next = onProfileOrOriginChange(auth, { profileId: 'p2', modelOrigin: 'origin' })
    expect(next.profileId).toBe('p2')
    expect(next.grants).toEqual([])
    expect(canSend(next, 'name', 'screenshot-solve')).toBe(false)
  })

  it('clears grants when the modelOrigin changes', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    const next = onProfileOrOriginChange(auth, { profileId: 'p1', modelOrigin: 'other-origin' })
    expect(next.modelOrigin).toBe('other-origin')
    expect(next.grants).toEqual([])
  })

  it('is a no-op returning the same reference when neither changed', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    const next = onProfileOrOriginChange(auth, { profileId: 'p1', modelOrigin: 'origin' })
    expect(next).toBe(auth)
  })

  it('does not mutate the input when invalidating (purity)', () => {
    let auth = createAuthorization('p1', 'origin')
    auth = setFieldGrant(auth, 'name', { purposes: { 'screenshot-solve': true } })
    const before = JSON.stringify(auth)
    onProfileOrOriginChange(auth, { profileId: 'p2', modelOrigin: 'origin' })
    expect(JSON.stringify(auth)).toBe(before)
    expect(auth.grants).toHaveLength(1)
  })
})

describe('source purity', () => {
  it('module source contains no Date.now or Math.random', async () => {
    // The module must be deterministic and free of ambient IO.
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(
      new URL('../src/shared/profile-authorization.ts', import.meta.url),
      'utf8'
    )
    expect(src).not.toContain('Date.now')
    expect(src).not.toContain('Math.random')
  })
})
