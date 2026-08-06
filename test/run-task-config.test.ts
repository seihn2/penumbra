import { describe, expect, it } from 'vitest'
import { buildRunTaskParameters } from '../src/main/asr/run-task-config'

describe('buildRunTaskParameters', () => {
  it('uses the documented Qwen-Audio 3.0 parameter set', () => {
    expect(buildRunTaskParameters('qwen-audio-3.0-asr-flash-streaming', ['zh', 'en'])).toEqual({
      format: 'pcm',
      sample_rate: 16000,
      heartbeat: true,
      language_hints: ['zh', 'en']
    })
  })

  it('recognizes pinned Qwen-Audio snapshots', () => {
    const parameters = buildRunTaskParameters('qwen-audio-3.0-asr-flash-streaming-2026-07-30')
    expect(parameters.heartbeat).toBe(true)
    expect(parameters).not.toHaveProperty('disfluency_removal_enabled')
    expect(parameters).not.toHaveProperty('punctuation_prediction_enabled')
  })

  it('preserves the legacy cleanup parameters for compatibility models', () => {
    expect(buildRunTaskParameters('fun-asr-realtime')).toEqual({
      format: 'pcm',
      sample_rate: 16000,
      disfluency_removal_enabled: true,
      punctuation_prediction_enabled: true
    })
  })

  it('falls back to auto-detection when a compatibility model receives mixed hints', () => {
    const parameters = buildRunTaskParameters('fun-asr-realtime', ['zh', 'en'])
    expect(parameters).not.toHaveProperty('language_hints')
    expect(buildRunTaskParameters('fun-asr-realtime', ['en']).language_hints).toEqual(['en'])
  })
})
