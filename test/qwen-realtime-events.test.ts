import { describe, expect, it } from 'vitest'
import { mapQwenTranscriptionEvent, extractQwenError } from '../src/shared/qwen-realtime-events'
import {
  asrProtocolFor,
  isAsrModel,
  ASR_MODELS,
  DEFAULT_ASR_MODEL,
  isCompatibilityAsrModel,
  isQwenAudioStreamingModel
} from '../src/shared/asr-models'

describe('mapQwenTranscriptionEvent', () => {
  it('maps an incremental text event to a partial (text + stash preview)', () => {
    const r = mapQwenTranscriptionEvent({
      type: 'conversation.item.input_audio_transcription.text',
      text: '北京',
      stash: '的天气'
    })
    expect(r).toEqual({ text: '北京的天气', isPartial: true })
  })

  it('treats a confirmed prefix with empty stash as a partial', () => {
    const r = mapQwenTranscriptionEvent({
      type: 'conversation.item.input_audio_transcription.text',
      text: '你好',
      stash: ''
    })
    expect(r).toEqual({ text: '你好', isPartial: true })
  })

  it('ignores an empty incremental event', () => {
    const r = mapQwenTranscriptionEvent({
      type: 'conversation.item.input_audio_transcription.text',
      text: '',
      stash: ''
    })
    expect(r).toBeNull()
  })

  it('maps a completed event to a final using the transcript field', () => {
    const r = mapQwenTranscriptionEvent({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: '今天天气怎么样'
    })
    expect(r).toEqual({ text: '今天天气怎么样', isPartial: false })
  })

  it('ignores a completed event with no transcript', () => {
    const r = mapQwenTranscriptionEvent({
      type: 'conversation.item.input_audio_transcription.completed'
    })
    expect(r).toBeNull()
  })

  it('ignores unrelated events', () => {
    expect(mapQwenTranscriptionEvent({ type: 'session.updated' })).toBeNull()
    expect(mapQwenTranscriptionEvent({ type: 'input_audio_buffer.committed' })).toBeNull()
  })
})

describe('extractQwenError', () => {
  it('extracts a top-level error message', () => {
    expect(extractQwenError({ type: 'error', error: { message: 'bad key' } })).toBe('bad key')
  })

  it('extracts a per-item failed message', () => {
    expect(
      extractQwenError({
        type: 'conversation.item.input_audio_transcription.failed',
        error: { message: 'decode failed' }
      })
    ).toBe('decode failed')
  })

  it('falls back to a generic message when none is provided', () => {
    expect(extractQwenError({ type: 'error' })).toBe('语音识别失败')
  })

  it('returns null for non-error events', () => {
    expect(extractQwenError({ type: 'session.created' })).toBeNull()
  })
})

describe('asrProtocolFor', () => {
  it('routes the realtime model to the realtime protocol', () => {
    expect(asrProtocolFor('qwen3-asr-flash-realtime')).toBe('realtime')
    expect(asrProtocolFor('qwen3-asr-flash-realtime-2026-02-10')).toBe('realtime')
  })

  it('routes legacy models to run-task', () => {
    expect(asrProtocolFor('fun-asr-realtime')).toBe('run-task')
    expect(asrProtocolFor('paraformer-realtime-v2')).toBe('run-task')
  })

  it('defaults unknown/custom models to run-task', () => {
    expect(asrProtocolFor('some-custom-model')).toBe('run-task')
  })

  it('keeps the realtime model in the selectable list', () => {
    expect(ASR_MODELS).toContain('qwen3-asr-flash-realtime')
    expect(ASR_MODELS).toContain('qwen3-asr-flash-realtime-2026-02-10')
    expect(isAsrModel('qwen3-asr-flash-realtime')).toBe(true)
  })

  it('uses Qwen-Audio 3.0 as the recommended default', () => {
    expect(DEFAULT_ASR_MODEL).toBe('qwen-audio-3.0-asr-flash-streaming')
    expect(ASR_MODELS).toContain(DEFAULT_ASR_MODEL)
    expect(isQwenAudioStreamingModel(DEFAULT_ASR_MODEL)).toBe(true)
  })

  it('keeps older run-task models as compatibility choices', () => {
    expect(isCompatibilityAsrModel('fun-asr-realtime')).toBe(true)
    expect(isCompatibilityAsrModel('paraformer-realtime-v2')).toBe(true)
    expect(isCompatibilityAsrModel(DEFAULT_ASR_MODEL)).toBe(false)
  })
})
