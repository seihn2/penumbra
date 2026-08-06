import { describe, expect, it } from 'vitest'
import { buildQwenRealtimeSession } from '../src/main/asr/qwen-realtime-config'

describe('buildQwenRealtimeSession', () => {
  it('sets a single explicit language hint', () => {
    expect(buildQwenRealtimeSession(['en'])).toMatchObject({
      input_audio_transcription: { language: 'en' }
    })
  })

  it('uses automatic detection for mixed-language hints', () => {
    expect(buildQwenRealtimeSession(['zh', 'en'])).not.toHaveProperty('input_audio_transcription')
  })

  it('keeps the low-latency server VAD configuration', () => {
    expect(buildQwenRealtimeSession()).toMatchObject({
      input_audio_format: 'pcm',
      sample_rate: 16000,
      turn_detection: { type: 'server_vad', threshold: 0.0, silence_duration_ms: 400 }
    })
  })
})
