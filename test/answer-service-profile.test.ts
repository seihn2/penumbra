import { describe, expect, it } from 'vitest'
import {
  createAnswerServiceProfile,
  createDefaultAnswerServiceProfile,
  getActiveAnswerServiceProfile,
  nextAnswerServiceProfileName,
  removeAnswerServiceProfile,
  sanitizeAnswerServiceProfileState,
  updateAnswerServiceProfile
} from '../src/shared/answer-service-profile'

describe('answer service profiles', () => {
  it('migrates legacy endpoint/model into one default profile', () => {
    const state = sanitizeAnswerServiceProfileState(undefined, undefined, {
      endpoint: 'https://api.example.com/v1',
      model: 'model-a',
      protocol: 'responses'
    })
    expect(state.profiles).toHaveLength(1)
    expect(getActiveAnswerServiceProfile(state)).toMatchObject({
      name: '默认服务',
      endpoint: 'https://api.example.com/v1',
      model: 'model-a',
      protocol: 'responses'
    })
  })

  it('sanitizes corrupt profiles and picks an existing active profile', () => {
    const a = createAnswerServiceProfile({ id: 'a', name: 'OpenAI', model: 'gpt' })
    const b = createAnswerServiceProfile({ id: 'b', name: 'DeepSeek', model: 'deepseek' })
    const state = sanitizeAnswerServiceProfileState([null, a, b, { nope: true }], 'b')
    expect(state.profiles.map((profile) => profile.id)).toEqual(['a', 'b'])
    expect(getActiveAnswerServiceProfile(state).id).toBe('b')
  })

  it('updates metadata without changing the credential reference', () => {
    const profile = createAnswerServiceProfile({
      id: 'a',
      name: 'Old',
      credentialRef: 'secret-a'
    })
    const [updated] = updateAnswerServiceProfile([profile], 'a', {
      name: 'New',
      endpoint: 'https://api.example.com/v1',
      protocol: 'chat-completions',
      modelCache: ['a', 'a', 'b']
    })
    expect(updated.credentialRef).toBe('secret-a')
    expect(updated.name).toBe('New')
    expect(updated.protocol).toBe('chat-completions')
    expect(updated.modelCache).toEqual(['a', 'b'])
    expect(updated.fingerprint).not.toBe(profile.fingerprint)
  })

  it('moves active selection when a profile is deleted', () => {
    const a = createAnswerServiceProfile({ id: 'a', name: 'A' })
    const b = createAnswerServiceProfile({ id: 'b', name: 'B' })
    const next = removeAnswerServiceProfile({ profiles: [a, b], activeProfileId: 'b' }, 'b')
    expect(next.profiles.map((profile) => profile.id)).toEqual(['a'])
    expect(next.activeProfileId).toBe('a')
  })

  it('creates unique human-readable names', () => {
    const profiles = [
      createAnswerServiceProfile({ id: 'a', name: '回答服务' }),
      createAnswerServiceProfile({ id: 'b', name: '回答服务 2' })
    ]
    expect(nextAnswerServiceProfileName(profiles)).toBe('回答服务 3')
  })

  it('always keeps a fallback profile', () => {
    const only = createDefaultAnswerServiceProfile()
    expect(
      removeAnswerServiceProfile({ profiles: [only], activeProfileId: only.id }, only.id).profiles
    ).toHaveLength(1)
  })
})
