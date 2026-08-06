import { app, safeStorage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type SecretSettings = {
  apiKey: string
  dashscopeApiKey: string
}

const emptySecrets: SecretSettings = {
  apiKey: '',
  dashscopeApiKey: ''
}

type PersistedSecrets = {
  version: 1
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

      return {
        apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
        dashscopeApiKey: typeof value.dashscopeApiKey === 'string' ? value.dashscopeApiKey : ''
      }
    } catch {
      return { ...emptySecrets }
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
          version: 1,
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

  private get filePath(): string {
    return this.configuredFilePath ?? join(app.getPath('userData'), 'secure-settings.json')
  }

  private decodePayload(persisted: PersistedSecrets): string {
    if (persisted.version !== 1 || persisted.encoding !== 'base64') {
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

    return normalized
  }
}

export const secureSettingsStore = new SecureSettingsStore()
