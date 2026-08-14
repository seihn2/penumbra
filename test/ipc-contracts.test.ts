import { describe, expect, it } from 'vitest'
import {
  parseAnswerServiceCredentialRef,
  parseAnswerServiceKeyWrite,
  parseAnswerServiceProfileActivation,
  parseAppSettingsPatch,
  parseAppStatePatch,
  parseAudioSourceRole,
  parseNonEmptyString,
  parseShortcutsArray,
  parseShortcutsRecord
} from '../src/main/ipc-contracts'

describe('answer-service profile IPC contracts', () => {
  it('accepts a strict profile activation payload', () => {
    const activation = {
      id: 'answer-openai',
      endpoint: 'https://api.openai.com/v1',
      credentialRef: 'answer-key:answer-openai',
      model: 'gpt-5',
      protocol: 'responses'
    }
    expect(parseAnswerServiceProfileActivation(activation)).toEqual(activation)
    expect(() => parseAnswerServiceProfileActivation({ ...activation, rawKey: 'secret' })).toThrow()
  })

  it('validates credential references and key writes', () => {
    expect(parseAnswerServiceCredentialRef('answer-key:one')).toBe('answer-key:one')
    expect(parseAnswerServiceKeyWrite({ credentialRef: 'answer-key:one', key: 'sk-one' })).toEqual({
      credentialRef: 'answer-key:one',
      key: 'sk-one'
    })
    for (const unsafe of ['', '__proto__', 'constructor', 'prototype']) {
      expect(() => parseAnswerServiceCredentialRef(unsafe)).toThrow()
    }
    expect(() => parseAnswerServiceKeyWrite({ credentialRef: 'answer-key:one', key: '' })).toThrow()
  })
})

describe('parseAppSettingsPatch', () => {
  it('accepts a partial patch', () => {
    expect(
      parseAppSettingsPatch({ apiKey: 'sk-1', model: 'gpt', screenshotDisplayId: '123' })
    ).toEqual({
      apiKey: 'sk-1',
      model: 'gpt',
      screenshotDisplayId: '123'
    })
  })

  it('accepts an empty patch', () => {
    expect(parseAppSettingsPatch({})).toEqual({})
  })

  it('accepts the macOS traffic-light visibility setting', () => {
    expect(parseAppSettingsPatch({ trafficLightMode: 'hover' })).toEqual({
      trafficLightMode: 'hover'
    })
  })

  it('accepts only a boolean 0 UI mode setting', () => {
    expect(parseAppSettingsPatch({ zeroUiMode: true })).toEqual({ zeroUiMode: true })
    expect(() => parseAppSettingsPatch({ zeroUiMode: 'yes' })).toThrow()
  })

  it('rejects unknown keys', () => {
    expect(() => parseAppSettingsPatch({ rogue: true })).toThrow()
  })

  it('rejects wrong value types', () => {
    expect(() => parseAppSettingsPatch({ apiKey: 123 })).toThrow()
    expect(() => parseAppSettingsPatch({ interviewCoachEnabled: 'yes' })).toThrow()
  })

  it('rejects invalid enum values', () => {
    expect(() => parseAppSettingsPatch({ answerApiProtocol: 'legacy' })).toThrow()
    expect(() => parseAppSettingsPatch({ speakerDiarizationMode: 'magic' })).toThrow()
    expect(() => parseAppSettingsPatch({ transcriptionLanguage: 'xx' })).toThrow()
  })

  it('accepts valid enum values', () => {
    expect(parseAppSettingsPatch({ answerApiProtocol: 'responses' })).toEqual({
      answerApiProtocol: 'responses'
    })
    expect(parseAppSettingsPatch({ answerApiProtocol: 'anthropic-messages' })).toEqual({
      answerApiProtocol: 'anthropic-messages'
    })
    expect(parseAppSettingsPatch({ trafficLightMode: 'hidden' })).toEqual({
      trafficLightMode: 'hidden'
    })
    expect(parseAppSettingsPatch({ speakerDiarizationMode: 'provider' })).toEqual({
      speakerDiarizationMode: 'provider'
    })
    expect(parseAppSettingsPatch({ transcriptionLanguage: 'auto' })).toEqual({
      transcriptionLanguage: 'auto'
    })
    expect(parseAppSettingsPatch({ transcriptionLanguage: 'zh-en' })).toEqual({
      transcriptionLanguage: 'zh-en'
    })
    expect(parseAppSettingsPatch({ asrModel: 'qwen-audio-3.0-asr-flash-streaming' })).toEqual({
      asrModel: 'qwen-audio-3.0-asr-flash-streaming'
    })
    expect(parseAppSettingsPatch({ asrModel: 'qwen3-asr-flash-realtime-2026-02-10' })).toEqual({
      asrModel: 'qwen3-asr-flash-realtime-2026-02-10'
    })
  })
})

describe('parseAppStatePatch', () => {
  it('accepts known boolean fields', () => {
    expect(parseAppStatePatch({ ignoreMouse: true })).toEqual({ ignoreMouse: true })
  })

  it('rejects unknown keys', () => {
    expect(() => parseAppStatePatch({ foo: 1 })).toThrow()
  })
})

describe('parseShortcutsRecord / parseShortcutsArray', () => {
  it('accepts a valid record', () => {
    const record = { takeScreenshot: { action: 'takeScreenshot', key: 'Alt+Enter' } }
    expect(parseShortcutsRecord(record)).toEqual(record)
  })

  it('accepts a valid array', () => {
    const arr = [{ action: 'takeScreenshot', key: 'Alt+Enter' }]
    expect(parseShortcutsArray(arr)).toEqual(arr)
  })

  it('strips extra renderer-only fields (defaultKey/category/status)', () => {
    const record = {
      moveMainWindowRight: {
        action: 'moveMainWindowRight',
        key: 'CommandOrControl+Right',
        defaultKey: 'CommandOrControl+Right',
        category: 'Window Movement',
        status: 'registered'
      }
    }
    expect(parseShortcutsRecord(record)).toEqual({
      moveMainWindowRight: { action: 'moveMainWindowRight', key: 'CommandOrControl+Right' }
    })
  })

  it('rejects empty action or key', () => {
    expect(() => parseShortcutsArray([{ action: '', key: 'X' }])).toThrow()
    expect(() => parseShortcutsArray([{ action: 'a', key: '' }])).toThrow()
  })
})

describe('parseAudioSourceRole', () => {
  it('accepts system and microphone', () => {
    expect(parseAudioSourceRole('system')).toBe('system')
    expect(parseAudioSourceRole('microphone')).toBe('microphone')
  })

  it('rejects anything else', () => {
    expect(() => parseAudioSourceRole('speaker')).toThrow()
  })
})

describe('parseNonEmptyString', () => {
  it('accepts non-empty strings', () => {
    expect(parseNonEmptyString('hello')).toBe('hello')
  })

  it('rejects empty strings and non-strings', () => {
    expect(() => parseNonEmptyString('')).toThrow()
    expect(() => parseNonEmptyString(42)).toThrow()
  })
})
