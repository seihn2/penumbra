import { describe, expect, it } from 'vitest'
import { resolveAudioSources } from '../src/renderer/src/coder/hooks/audio-sources'

describe('resolveAudioSources', () => {
  it('macOS single-source: mic only (loopback unsupported)', () => {
    expect(resolveAudioSources(true, false)).toEqual({ wantSystemAudio: false, wantMic: true })
  })

  it('macOS dual-source: both attempted', () => {
    expect(resolveAudioSources(true, true)).toEqual({ wantSystemAudio: true, wantMic: true })
  })

  it('non-macOS single-source: system audio only', () => {
    expect(resolveAudioSources(false, false)).toEqual({ wantSystemAudio: true, wantMic: false })
  })

  it('non-macOS dual-source: both attempted', () => {
    expect(resolveAudioSources(false, true)).toEqual({ wantSystemAudio: true, wantMic: true })
  })

  it('always attempts at least one source', () => {
    for (const isMac of [true, false]) {
      for (const dual of [true, false]) {
        const r = resolveAudioSources(isMac, dual)
        expect(r.wantSystemAudio || r.wantMic).toBe(true)
      }
    }
  })
})
