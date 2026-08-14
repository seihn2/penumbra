import { app, safeStorage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF } from '../../shared/answer-service-profile'

export type SecretSettings = {
  /** Legacy mirror retained only for backwards-compatible migration. */
  apiKey: string
  dashscopeApiKey: string
  answerServiceKeys: Record<string, string>
  knowledgeSourceKeys: Record<string, string>
}

function emptySecrets(): SecretSettings {
  return { apiKey: '', dashscopeApiKey: '', answerServiceKeys: {}, knowledgeSourceKeys: {} }
}

type PersistedSecrets = {
  version: 1 | 2 | 3
  encrypted: boolean
  encoding: 'base64'
  payload: string
}

export class SecureSettingsStore {
  private readonly configuredFilePath?: string

  constructor(filePath?: string) {
    this.configuredFilePath = filePath
  }

  load(): SecretSettings {
    try {
      const raw = readFileSync(this.filePath, 'utf8')
      const persisted = JSON.parse(raw) as PersistedSecrets
      const json = this.decodePayload(persisted)
      const value = JSON.parse(json) as Partial<SecretSettings>
      const apiKey = typeof value.apiKey === 'string' ? value.apiKey : ''
      const answerServiceKeys = normalizeAnswerServiceKeys(value.answerServiceKeys)
      const knowledgeSourceKeys = normalizeSecretMap(value.knowledgeSourceKeys)
      if (apiKey && !answerServiceKeys[DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF]) {
        answerServiceKeys[DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF] = apiKey
      }

      return {
        apiKey,
        dashscopeApiKey: typeof value.dashscopeApiKey === 'string' ? value.dashscopeApiKey : '',
        answerServiceKeys,
        knowledgeSourceKeys
      }
    } catch {
      return emptySecrets()
    }
  }

  save(nextSecrets: Partial<SecretSettings>): SecretSettings {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Safe storage encryption is unavailable')
    }

    const secrets = { ...this.load(), ...this.normalize(nextSecrets) }
    const payload = Buffer.from(JSON.stringify(secrets), 'utf8')
    const storedPayload = safeStorage.encryptString(payload.toString('utf8'))

    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(
      this.filePath,
      JSON.stringify(
        {
          version: 3,
          encrypted: true,
          encoding: 'base64',
          payload: storedPayload.toString('base64')
        } satisfies PersistedSecrets,
        null,
        2
      ),
      { mode: 0o600 }
    )

    return secrets
  }

  getAnswerServiceKey(credentialRef: string): string {
    return this.load().answerServiceKeys[credentialRef] ?? ''
  }

  saveAnswerServiceKey(credentialRef: string, rawKey: string): SecretSettings {
    const current = this.load()
    const answerServiceKeys = { ...current.answerServiceKeys, [credentialRef]: rawKey }
    return this.save({
      answerServiceKeys,
      ...(credentialRef === DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF ? { apiKey: rawKey } : {})
    })
  }

  deleteAnswerServiceKey(credentialRef: string): SecretSettings {
    const current = this.load()
    const answerServiceKeys = { ...current.answerServiceKeys }
    delete answerServiceKeys[credentialRef]
    return this.save({
      answerServiceKeys,
      ...(credentialRef === DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF ? { apiKey: '' } : {})
    })
  }

  getKnowledgeSourceKey(sourceId: string): string {
    return this.load().knowledgeSourceKeys[sourceId] ?? ''
  }

  saveKnowledgeSourceKey(sourceId: string, rawKey: string): SecretSettings {
    const current = this.load()
    return this.save({
      knowledgeSourceKeys: { ...current.knowledgeSourceKeys, [sourceId]: rawKey }
    })
  }

  deleteKnowledgeSourceKey(sourceId: string): SecretSettings {
    const current = this.load()
    const knowledgeSourceKeys = { ...current.knowledgeSourceKeys }
    delete knowledgeSourceKeys[sourceId]
    return this.save({ knowledgeSourceKeys })
  }

  private get filePath(): string {
    return this.configuredFilePath ?? join(app.getPath('userData'), 'secure-settings.json')
  }

  private decodePayload(persisted: PersistedSecrets): string {
    if (
      (persisted.version !== 1 && persisted.version !== 2 && persisted.version !== 3) ||
      persisted.encoding !== 'base64'
    ) {
      throw new Error('Unsupported secure settings format')
    }

    const payload = Buffer.from(persisted.payload, 'base64')
    if (!persisted.encrypted) {
      throw new Error('Insecure secret settings format is not supported')
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Safe storage encryption is unavailable')
    }

    return safeStorage.decryptString(payload)
  }

  private normalize(value: Partial<SecretSettings>): Partial<SecretSettings> {
    const normalized: Partial<SecretSettings> = {}

    if ('apiKey' in value) normalized.apiKey = value.apiKey ?? ''
    if ('dashscopeApiKey' in value) normalized.dashscopeApiKey = value.dashscopeApiKey ?? ''
    if ('answerServiceKeys' in value) {
      normalized.answerServiceKeys = normalizeAnswerServiceKeys(value.answerServiceKeys)
    }
    if ('knowledgeSourceKeys' in value) {
      normalized.knowledgeSourceKeys = normalizeSecretMap(value.knowledgeSourceKeys)
    }

    return normalized
  }
}

function normalizeAnswerServiceKeys(value: unknown): Record<string, string> {
  return normalizeSecretMap(value)
}

function normalizeSecretMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const normalized: Record<string, string> = {}
  for (const [credentialRef, rawKey] of Object.entries(value)) {
    if (!isSafeCredentialRef(credentialRef) || typeof rawKey !== 'string') continue
    normalized[credentialRef] = rawKey
  }
  return normalized
}

function isSafeCredentialRef(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 200 &&
    value !== '__proto__' &&
    value !== 'constructor' &&
    value !== 'prototype'
  )
}

export const secureSettingsStore = new SecureSettingsStore()
