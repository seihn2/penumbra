import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const answerServiceKeys: Record<string, string> = {}
  return { handlers, answerServiceKeys }
})

vi.mock('electron', () => ({
  app: {
    getPath: () => '',
    dock: { hide: vi.fn(), show: vi.fn() }
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  },
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      mocks.handlers.set(channel, handler)
    }
  },
  safeStorage: { isEncryptionAvailable: () => true },
  screen: {
    getPrimaryDisplay: () => ({ id: 1 }),
    getAllDisplays: () => []
  }
}))

vi.mock('../src/main/services/secure-settings-store', () => ({
  secureSettingsStore: {
    load: () => ({
      apiKey: '',
      dashscopeApiKey: '',
      answerServiceKeys: { ...mocks.answerServiceKeys }
    }),
    getAnswerServiceKey: (credentialRef: string) => mocks.answerServiceKeys[credentialRef] ?? '',
    saveAnswerServiceKey: (credentialRef: string, key: string) => {
      mocks.answerServiceKeys[credentialRef] = key
    },
    deleteAnswerServiceKey: (credentialRef: string) => {
      delete mocks.answerServiceKeys[credentialRef]
    },
    save: vi.fn()
  }
}))

vi.mock('../src/main/asr/asr-log', () => ({ asrLog: vi.fn() }))

import { settings } from '../src/main/settings'

function handler(channel: string): (...args: unknown[]) => unknown {
  const registered = mocks.handlers.get(channel)
  if (!registered) throw new Error(`Missing IPC handler: ${channel}`)
  return registered
}

describe('answer-service profile main-process activation', () => {
  it('switches endpoint/model/key atomically without exposing the raw key to renderer', () => {
    const saveKey = handler('save-answer-service-key')
    const activate = handler('activate-answer-service-profile')
    const getSettings = handler('getAppSettings')
    const deleteKey = handler('delete-answer-service-key')

    saveKey(null, { credentialRef: 'answer-key:one', key: 'sk-one' })
    saveKey(null, { credentialRef: 'answer-key:two', key: 'sk-two' })

    expect(
      activate(null, {
        id: 'one',
        endpoint: 'https://one.example/v1',
        credentialRef: 'answer-key:one',
        model: 'model-one',
        protocol: 'responses'
      })
    ).toMatchObject({ keyStatus: { phase: 'saved' } })
    expect(settings).toMatchObject({
      apiBaseURL: 'https://one.example/v1',
      model: 'model-one',
      answerApiProtocol: 'responses',
      apiKey: 'sk-one'
    })

    activate(null, {
      id: 'two',
      endpoint: 'https://two.example/v1',
      credentialRef: 'answer-key:two',
      model: 'model-two',
      protocol: 'chat-completions'
    })
    expect(settings).toMatchObject({
      apiBaseURL: 'https://two.example/v1',
      model: 'model-two',
      answerApiProtocol: 'chat-completions',
      apiKey: 'sk-two'
    })
    expect(getSettings()).toMatchObject({ apiKey: '' })

    deleteKey(null, 'answer-key:one')
    expect(mocks.answerServiceKeys).toEqual({ 'answer-key:two': 'sk-two' })
    expect(settings.apiKey).toBe('sk-two')
  })
})
