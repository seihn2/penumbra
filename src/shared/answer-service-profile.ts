import { withFingerprint, type ProviderProfile, type ProviderTestResult } from './provider-profile'
import {
  DEFAULT_ANSWER_API_PROTOCOL,
  sanitizeAnswerApiProtocol,
  type AnswerApiProtocol
} from './answer-api-protocol'

export const DEFAULT_ANSWER_SERVICE_PROFILE_ID = 'answer-default'
export const DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF = 'answer-key:answer-default'

export interface AnswerServiceProfile extends ProviderProfile {
  name: string
  protocol: AnswerApiProtocol
}

export interface AnswerServiceProfileState {
  profiles: AnswerServiceProfile[]
  activeProfileId: string
}

export interface AnswerServiceProfileActivation {
  id: string
  endpoint: string
  credentialRef: string
  model: string
  protocol: AnswerApiProtocol
}

export function createAnswerServiceProfile(input: {
  id: string
  name: string
  endpoint?: string
  credentialRef?: string
  model?: string
  protocol?: AnswerApiProtocol
  modelCache?: string[]
  lastTest?: ProviderTestResult
}): AnswerServiceProfile {
  const profile: AnswerServiceProfile = {
    id: input.id,
    name: input.name.trim() || '回答服务',
    endpoint: input.endpoint?.trim() ?? '',
    credentialRef: input.credentialRef?.trim() || `answer-key:${input.id}`,
    model: input.model?.trim() ?? '',
    protocol: sanitizeAnswerApiProtocol(input.protocol),
    modelCache: uniqueStrings(input.modelCache),
    lastTest: sanitizeTestResult(input.lastTest),
    fingerprint: ''
  }
  return withFingerprint(profile) as AnswerServiceProfile
}

export function createDefaultAnswerServiceProfile(
  endpoint = '',
  model = '',
  protocol: AnswerApiProtocol = DEFAULT_ANSWER_API_PROTOCOL
): AnswerServiceProfile {
  return createAnswerServiceProfile({
    id: DEFAULT_ANSWER_SERVICE_PROFILE_ID,
    name: '默认服务',
    endpoint,
    credentialRef: DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF,
    model,
    protocol
  })
}

export function sanitizeAnswerServiceProfileState(
  profilesValue: unknown,
  activeProfileIdValue: unknown,
  legacy: { endpoint?: string; model?: string; protocol?: unknown } = {}
): AnswerServiceProfileState {
  const profiles = Array.isArray(profilesValue)
    ? profilesValue
        .map(sanitizeProfile)
        .filter((profile): profile is AnswerServiceProfile => !!profile)
    : []
  const fallbackProfiles = profiles.length
    ? profiles
    : [
        createDefaultAnswerServiceProfile(
          legacy.endpoint,
          legacy.model,
          sanitizeAnswerApiProtocol(legacy.protocol)
        )
      ]
  const requestedId = typeof activeProfileIdValue === 'string' ? activeProfileIdValue : ''
  const activeProfileId = fallbackProfiles.some((profile) => profile.id === requestedId)
    ? requestedId
    : fallbackProfiles[0].id
  return { profiles: fallbackProfiles, activeProfileId }
}

export function getActiveAnswerServiceProfile(
  state: AnswerServiceProfileState
): AnswerServiceProfile {
  return (
    state.profiles.find((profile) => profile.id === state.activeProfileId) ??
    state.profiles[0] ??
    createDefaultAnswerServiceProfile()
  )
}

export function toAnswerServiceProfileActivation(
  profile: AnswerServiceProfile
): AnswerServiceProfileActivation {
  return {
    id: profile.id,
    endpoint: profile.endpoint,
    credentialRef: profile.credentialRef,
    model: profile.model,
    protocol: profile.protocol
  }
}

export function updateAnswerServiceProfile(
  profiles: AnswerServiceProfile[],
  profileId: string,
  patch: Partial<
    Pick<
      AnswerServiceProfile,
      'name' | 'endpoint' | 'model' | 'protocol' | 'modelCache' | 'lastTest'
    >
  >
): AnswerServiceProfile[] {
  return profiles.map((profile) => {
    if (profile.id !== profileId) return profile
    return createAnswerServiceProfile({
      ...profile,
      ...patch,
      id: profile.id,
      credentialRef: profile.credentialRef
    })
  })
}

export function removeAnswerServiceProfile(
  state: AnswerServiceProfileState,
  profileId: string
): AnswerServiceProfileState {
  const profiles = state.profiles.filter((profile) => profile.id !== profileId)
  if (profiles.length === 0) {
    const fallback = createDefaultAnswerServiceProfile()
    return { profiles: [fallback], activeProfileId: fallback.id }
  }
  return {
    profiles,
    activeProfileId: state.activeProfileId === profileId ? profiles[0].id : state.activeProfileId
  }
}

export function nextAnswerServiceProfileName(
  profiles: AnswerServiceProfile[],
  baseName = '回答服务'
): string {
  const names = new Set(profiles.map((profile) => profile.name.trim().toLowerCase()))
  if (!names.has(baseName.toLowerCase())) return baseName
  let suffix = 2
  while (names.has(`${baseName} ${suffix}`.toLowerCase())) suffix += 1
  return `${baseName} ${suffix}`
}

function sanitizeProfile(value: unknown): AnswerServiceProfile | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<AnswerServiceProfile>
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null
  return createAnswerServiceProfile({
    id: candidate.id.trim(),
    name: typeof candidate.name === 'string' ? candidate.name : '回答服务',
    endpoint: typeof candidate.endpoint === 'string' ? candidate.endpoint : '',
    credentialRef:
      typeof candidate.credentialRef === 'string' ? candidate.credentialRef : undefined,
    model: typeof candidate.model === 'string' ? candidate.model : '',
    protocol: sanitizeAnswerApiProtocol(candidate.protocol),
    modelCache: candidate.modelCache,
    lastTest: candidate.lastTest
  })
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(value.filter((item): item is string => typeof item === 'string').map(trimmed))
  ].filter(Boolean)
}

function trimmed(value: string): string {
  return value.trim()
}

function sanitizeTestResult(value: unknown): ProviderTestResult | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<ProviderTestResult>
  if (typeof candidate.ok !== 'boolean' || typeof candidate.at !== 'number') return undefined
  return {
    ok: candidate.ok,
    at: candidate.at,
    ...(typeof candidate.error === 'string' ? { error: candidate.error } : {})
  }
}
