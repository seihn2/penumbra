import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '' },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8').replace(/^encrypted:/, '')
  }
}))

import {
  SecureSettingsStore,
  type SecretSettings
} from '../src/main/services/secure-settings-store'
import { DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF } from '../src/shared/answer-service-profile'

let tempDir = ''
let filePath = ''

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'penumbra-secure-settings-'))
  filePath = join(tempDir, 'secure-settings.json')
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

function writeLegacySecrets(secrets: Partial<SecretSettings>): void {
  const payload = Buffer.from(`encrypted:${JSON.stringify(secrets)}`, 'utf8').toString('base64')
  writeFileSync(
    filePath,
    JSON.stringify({ version: 1, encrypted: true, encoding: 'base64', payload }),
    'utf8'
  )
}

describe('SecureSettingsStore answer-service keys', () => {
  it('keeps multiple profile keys isolated', () => {
    const store = new SecureSettingsStore(filePath)
    store.saveAnswerServiceKey('answer-key:one', 'sk-one')
    store.saveAnswerServiceKey('answer-key:two', 'sk-two')

    expect(store.getAnswerServiceKey('answer-key:one')).toBe('sk-one')
    expect(store.getAnswerServiceKey('answer-key:two')).toBe('sk-two')
    expect(store.load().answerServiceKeys).toEqual({
      'answer-key:one': 'sk-one',
      'answer-key:two': 'sk-two'
    })
  })

  it('migrates a v1 legacy apiKey into the default profile key', () => {
    writeLegacySecrets({ apiKey: 'sk-legacy', dashscopeApiKey: 'sk-asr' })
    const store = new SecureSettingsStore(filePath)

    expect(store.load()).toEqual({
      apiKey: 'sk-legacy',
      dashscopeApiKey: 'sk-asr',
      answerServiceKeys: { [DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF]: 'sk-legacy' },
      knowledgeSourceKeys: {}
    })

    store.saveAnswerServiceKey('answer-key:second', 'sk-second')
    const persisted = JSON.parse(readFileSync(filePath, 'utf8')) as { version: number }
    expect(persisted.version).toBe(3)
    expect(store.getAnswerServiceKey(DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF)).toBe('sk-legacy')
    expect(store.getAnswerServiceKey('answer-key:second')).toBe('sk-second')
  })

  it('does not resurrect a deleted default key from the legacy mirror', () => {
    writeLegacySecrets({ apiKey: 'sk-legacy' })
    const store = new SecureSettingsStore(filePath)

    store.deleteAnswerServiceKey(DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF)

    expect(store.getAnswerServiceKey(DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF)).toBe('')
    expect(store.load().apiKey).toBe('')
    expect(store.load().answerServiceKeys).toEqual({})
  })

  it('deletes one profile key without affecting the others', () => {
    const store = new SecureSettingsStore(filePath)
    store.saveAnswerServiceKey('answer-key:one', 'sk-one')
    store.saveAnswerServiceKey('answer-key:two', 'sk-two')

    store.deleteAnswerServiceKey('answer-key:one')

    expect(store.getAnswerServiceKey('answer-key:one')).toBe('')
    expect(store.getAnswerServiceKey('answer-key:two')).toBe('sk-two')
  })

  it('keeps external knowledge keys encrypted and isolated by source', () => {
    const store = new SecureSettingsStore(filePath)
    store.saveKnowledgeSourceKey('kb-one', 'kb-secret-one')
    store.saveKnowledgeSourceKey('kb-two', 'kb-secret-two')

    expect(store.getKnowledgeSourceKey('kb-one')).toBe('kb-secret-one')
    expect(store.getKnowledgeSourceKey('kb-two')).toBe('kb-secret-two')

    store.deleteKnowledgeSourceKey('kb-one')
    expect(store.getKnowledgeSourceKey('kb-one')).toBe('')
    expect(store.getKnowledgeSourceKey('kb-two')).toBe('kb-secret-two')
    expect(readFileSync(filePath, 'utf8')).not.toContain('kb-secret-two')
  })
})
