import { describe, expect, it } from 'vitest'
import {
  friendlyTranscriptionError,
  isTranscriptionError
} from '../src/renderer/src/coder/hooks/transcription-error'
import type { TFunction } from 'i18next'

// A stub t() that echoes the i18n key so we can assert on the mapped key.
const t = ((key: string) => key) as unknown as TFunction

describe('friendlyTranscriptionError', () => {
  it('returns the raw string (not a key) for an empty or missing raw error', () => {
    expect(friendlyTranscriptionError(t, '')).toBe('')
    expect(friendlyTranscriptionError(t, undefined)).toBe('')
  })

  it('maps disconnect errors to the disconnected key', () => {
    expect(friendlyTranscriptionError(t, 'WebSocket disconnected')).toBe(
      'transcription.errDisconnected'
    )
    expect(friendlyTranscriptionError(t, '连接已断开')).toBe('transcription.errDisconnected')
  })

  it('maps translation errors to the translate key', () => {
    expect(friendlyTranscriptionError(t, 'translation failed')).toBe('transcription.errTranslate')
    expect(friendlyTranscriptionError(t, 'Could not translate text')).toBe(
      'transcription.errTranslate'
    )
    expect(friendlyTranscriptionError(t, '翻译服务异常')).toBe('transcription.errTranslate')
  })

  it('maps timeout errors to the timeout key', () => {
    expect(friendlyTranscriptionError(t, 'Request timeout after 30s')).toBe(
      'transcription.errTimeout'
    )
    expect(friendlyTranscriptionError(t, '识别超时')).toBe('transcription.errTimeout')
  })

  it('maps auth failures to the auth key', () => {
    expect(friendlyTranscriptionError(t, 'InvalidApiKey')).toBe('transcription.errAuth')
    expect(friendlyTranscriptionError(t, 'Unauthorized')).toBe('transcription.errAuth')
    expect(friendlyTranscriptionError(t, 'HTTP 401')).toBe('transcription.errAuth')
    expect(friendlyTranscriptionError(t, '鉴权失败')).toBe('transcription.errAuth')
  })

  it('maps quota / billing errors to the quota key', () => {
    expect(friendlyTranscriptionError(t, 'Arrears: account suspended')).toBe(
      'transcription.errQuota'
    )
    expect(friendlyTranscriptionError(t, 'quota exceeded')).toBe('transcription.errQuota')
    expect(friendlyTranscriptionError(t, '账户欠费')).toBe('transcription.errQuota')
    expect(friendlyTranscriptionError(t, '余额不足')).toBe('transcription.errQuota')
  })

  it('is case-insensitive when matching latin keywords', () => {
    expect(friendlyTranscriptionError(t, 'DISCONNECT')).toBe('transcription.errDisconnected')
    expect(friendlyTranscriptionError(t, 'TRANSLATE')).toBe('transcription.errTranslate')
    expect(friendlyTranscriptionError(t, 'TIMEOUT')).toBe('transcription.errTimeout')
  })

  it('returns the raw string unchanged for an unrecognized error', () => {
    expect(friendlyTranscriptionError(t, 'something weird happened')).toBe(
      'something weird happened'
    )
    expect(friendlyTranscriptionError(t, '未知错误')).toBe('未知错误')
  })

  it('prefers the disconnect branch when multiple keywords are present', () => {
    expect(friendlyTranscriptionError(t, 'disconnected during translate timeout')).toBe(
      'transcription.errDisconnected'
    )
  })

  it('prefers the translate branch over timeout when both appear', () => {
    expect(friendlyTranscriptionError(t, 'translate timeout')).toBe('transcription.errTranslate')
  })
})

describe('isTranscriptionError', () => {
  // With the echo-key stub, each known message equals its own i18n key.
  const knownKeys = [
    'transcription.errDisconnected',
    'transcription.errTranslate',
    'transcription.errTimeout',
    'transcription.errAuth',
    'transcription.errQuota',
    'transcription.noKey'
  ]

  it('matches every known transcription error message', () => {
    for (const key of knownKeys) {
      expect(isTranscriptionError(t, key)).toBe(true)
    }
  })

  it('matches the interpolated startFailed message by prefix', () => {
    expect(isTranscriptionError(t, 'transcription.startFailed（麦克风：拒绝）')).toBe(true)
  })

  it('does not flag AI-solution or empty errors', () => {
    expect(isTranscriptionError(t, 'API 调用失败，请稍后重试')).toBe(false)
    expect(isTranscriptionError(t, '')).toBe(false)
    expect(isTranscriptionError(t, null)).toBe(false)
    expect(isTranscriptionError(t, undefined)).toBe(false)
  })
})
