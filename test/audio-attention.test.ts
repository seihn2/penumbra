import { describe, expect, it } from 'vitest'
import {
  createDualAudioState,
  onConnected,
  onConnecting,
  onDisconnected
} from '../src/shared/audio-source-machine'
import { audioAttentionEvents } from '../src/shared/audio-attention'
import { AUDIO_ALL_DISCONNECTED_SOURCE, partition } from '../src/shared/attention-event'

describe('audioAttentionEvents', () => {
  it('emits nothing when a source is healthy and live', () => {
    const state = onConnected(onConnecting(createDualAudioState(), 'system', 1), 'system', 2)
    expect(audioAttentionEvents(state)).toEqual([])
  })

  it('emits a single critical sentinel event when both sources are down', () => {
    let state = onConnected(onConnecting(createDualAudioState(), 'system', 1), 'system', 2)
    state = onDisconnected(state, 'system', { reason: 'unauthorized', now: 3 })
    const events = audioAttentionEvents(state)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      severity: 'critical',
      affectedCapability: 'audio',
      source: AUDIO_ALL_DISCONNECTED_SOURCE
    })
    // The governor must preempt on this event.
    expect(partition(events).preempting).toHaveLength(1)
  })

  it('warns (without preempting) on a terminal drop while another source is live', () => {
    // system live, microphone dropped with a terminal reason
    let state = onConnected(onConnecting(createDualAudioState(), 'system', 1), 'system', 2)
    state = onConnected(onConnecting(state, 'microphone', 3), 'microphone', 4)
    state = onDisconnected(state, 'microphone', { reason: 'device-disconnected', now: 5 })
    const events = audioAttentionEvents(state)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      severity: 'warn',
      affectedCapability: 'audio',
      requiresImmediate: false,
      source: 'audio-microphone'
    })
    const { preempting, later } = partition(events)
    expect(preempting).toEqual([])
    expect(later).toHaveLength(1)
  })

  it('stays quiet on a transient drop while another source is live', () => {
    let state = onConnected(onConnecting(createDualAudioState(), 'system', 1), 'system', 2)
    state = onConnected(onConnecting(state, 'microphone', 3), 'microphone', 4)
    // 'network' is transient (source goes to reconnecting), not terminal.
    state = onDisconnected(state, 'microphone', { reason: 'network', now: 5 })
    expect(audioAttentionEvents(state)).toEqual([])
  })

  it('does not mutate the input state', () => {
    let state = onConnected(onConnecting(createDualAudioState(), 'system', 1), 'system', 2)
    state = onDisconnected(state, 'system', { reason: 'unauthorized', now: 3 })
    const snapshot = JSON.parse(JSON.stringify(state))
    audioAttentionEvents(state)
    expect(state).toEqual(snapshot)
  })
})
