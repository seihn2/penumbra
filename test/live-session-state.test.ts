import { describe, expect, it } from 'vitest'
import {
  createLiveSnapshot,
  deriveLivePhase,
  allAudioDown,
  anyAudioActive,
  sessionElapsedMs,
  type LiveSessionSnapshot
} from '../src/shared/live-session-state'

function snap(overrides: Partial<LiveSessionSnapshot> = {}): LiveSessionSnapshot {
  return { ...createLiveSnapshot(), active: true, ...overrides }
}

describe('createLiveSnapshot', () => {
  it('starts idle with both audio sources idle and no start time', () => {
    const s = createLiveSnapshot()
    expect(s.active).toBe(false)
    expect(s.audio).toEqual({ system: 'idle', microphone: 'idle' })
    expect(s.startedAt).toBeNull()
  })
})

describe('allAudioDown / anyAudioActive', () => {
  it('treats connecting/live/reconnecting as working', () => {
    expect(allAudioDown({ system: 'live', microphone: 'idle' })).toBe(false)
    expect(allAudioDown({ system: 'idle', microphone: 'connecting' })).toBe(false)
    expect(allAudioDown({ system: 'reconnecting', microphone: 'unavailable' })).toBe(false)
  })

  it('is down only when neither source works', () => {
    expect(allAudioDown({ system: 'idle', microphone: 'idle' })).toBe(true)
    expect(allAudioDown({ system: 'unavailable', microphone: 'unavailable' })).toBe(true)
    expect(anyAudioActive({ system: 'unavailable', microphone: 'unavailable' })).toBe(false)
    expect(anyAudioActive({ system: 'live', microphone: 'unavailable' })).toBe(true)
  })
})

describe('deriveLivePhase', () => {
  it('is idle when not active', () => {
    expect(deriveLivePhase(createLiveSnapshot())).toBe('idle')
  })

  it('prioritizes audio-interrupted when active but all audio down', () => {
    const s = snap({
      audio: { system: 'unavailable', microphone: 'unavailable' },
      candidateSpeaking: true,
      hasReadyAnswer: true,
      assistInFlight: true
    })
    expect(deriveLivePhase(s)).toBe('audio-interrupted')
  })

  it('shows recording-answer while the candidate speaks (audio up)', () => {
    const s = snap({
      audio: { system: 'live', microphone: 'live' },
      candidateSpeaking: true,
      hasReadyAnswer: true
    })
    expect(deriveLivePhase(s)).toBe('recording-answer')
  })

  it('shows ready when answer points exist and no one is speaking', () => {
    const s = snap({ audio: { system: 'live', microphone: 'idle' }, hasReadyAnswer: true })
    expect(deriveLivePhase(s)).toBe('ready')
  })

  it('shows preparing while an assist is in flight', () => {
    const s = snap({ audio: { system: 'live', microphone: 'idle' }, assistInFlight: true })
    expect(deriveLivePhase(s)).toBe('preparing')
  })

  it('falls back to listening when active with working audio and nothing else', () => {
    const s = snap({ audio: { system: 'live', microphone: 'idle' } })
    expect(deriveLivePhase(s)).toBe('listening')
  })

  it('returns exactly one phase across the priority ladder', () => {
    // ready outranks preparing
    const s = snap({
      audio: { system: 'live', microphone: 'idle' },
      hasReadyAnswer: true,
      assistInFlight: true
    })
    expect(deriveLivePhase(s)).toBe('ready')
  })
})

describe('sessionElapsedMs', () => {
  it('is 0 before the session starts', () => {
    expect(sessionElapsedMs(createLiveSnapshot(), 1000)).toBe(0)
  })

  it('computes elapsed from startedAt', () => {
    expect(sessionElapsedMs(snap({ startedAt: 1000 }), 4000)).toBe(3000)
  })

  it('guards against clock skew (never negative)', () => {
    expect(sessionElapsedMs(snap({ startedAt: 5000 }), 1000)).toBe(0)
  })
})
