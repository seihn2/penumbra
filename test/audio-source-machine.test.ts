import { describe, expect, it } from 'vitest'
import {
  createDualAudioState,
  onConnecting,
  onConnected,
  onDisconnected,
  onReconnecting,
  onExhausted,
  anyLive,
  bothLive,
  allDown,
  openGaps,
  shouldEmitFullStop,
  type DisconnectReason,
  type DualAudioState
} from '../src/shared/audio-source-machine'

/** Bring both sources up to 'live' from a fresh state. */
function bothLiveState(): DualAudioState {
  let s = createDualAudioState()
  s = onConnected(s, 'system', 1)
  s = onConnected(s, 'microphone', 1)
  return s
}

describe('createDualAudioState', () => {
  it('starts both sources idle with no gaps and zeroed counters', () => {
    const s = createDualAudioState()
    expect(s.system).toEqual({
      role: 'system',
      status: 'idle',
      reason: 'none',
      reconnectAttempts: 0,
      lastChangeAt: 0,
      gaps: []
    })
    expect(s.microphone.role).toBe('microphone')
    expect(s.microphone.status).toBe('idle')
    expect(s.microphone.gaps).toEqual([])
  })
})

describe('onConnecting / onConnected', () => {
  it('onConnecting moves a source to connecting and stamps the time', () => {
    const s = onConnecting(createDualAudioState(), 'system', 5)
    expect(s.system.status).toBe('connecting')
    expect(s.system.lastChangeAt).toBe(5)
  })

  it('onConnected sets live, clears reason, resets reconnectAttempts', () => {
    let s = onConnecting(createDualAudioState(), 'microphone', 5)
    s = onConnected(s, 'microphone', 10)
    expect(s.microphone.status).toBe('live')
    expect(s.microphone.reason).toBe('none')
    expect(s.microphone.reconnectAttempts).toBe(0)
    expect(s.microphone.lastChangeAt).toBe(10)
  })
})

describe('one source failing leaves the other alone', () => {
  it('system network failure keeps microphone live and no full stop', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 20 })
    expect(s.system.status).toBe('reconnecting')
    expect(s.microphone.status).toBe('live')
    expect(anyLive(s)).toBe(true)
    expect(allDown(s)).toBe(false)
    expect(shouldEmitFullStop(s)).toBe(false)
  })

  it('microphone unavailable but system live still means no full stop', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'microphone', { reason: 'unauthorized', now: 20 })
    expect(s.microphone.status).toBe('unavailable')
    expect(s.system.status).toBe('live')
    expect(shouldEmitFullStop(s)).toBe(false)
  })
})

describe('both down triggers a full stop', () => {
  it('emits full stop only once both sources are down', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 20 })
    expect(shouldEmitFullStop(s)).toBe(false)
    s = onDisconnected(s, 'microphone', { reason: 'unauthorized', now: 21 })
    // system is still 'reconnecting' (a working status), so not yet all down
    expect(shouldEmitFullStop(s)).toBe(false)
    s = onExhausted(s, 'system', 22)
    expect(allDown(s)).toBe(true)
    expect(shouldEmitFullStop(s)).toBe(true)
  })
})

describe('transient disconnect behavior', () => {
  it('opens a gap, increments attempts, and moves to reconnecting', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 30 })
    expect(s.system.status).toBe('reconnecting')
    expect(s.system.reconnectAttempts).toBe(1)
    expect(openGaps(s, 'system')).toEqual([{ startedAt: 30, endedAt: null }])
  })

  it('reconnect closes the gap and resets attempts', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'asr-rejected', now: 30 })
    s = onReconnecting(s, 'system', 31)
    expect(s.system.reconnectAttempts).toBe(2)
    s = onConnected(s, 'system', 40)
    expect(s.system.status).toBe('live')
    expect(s.system.reconnectAttempts).toBe(0)
    expect(openGaps(s, 'system')).toEqual([])
    expect(s.system.gaps).toEqual([{ startedAt: 30, endedAt: 40 }])
  })
})

describe('terminal disconnect behavior', () => {
  const terminal: DisconnectReason[] = ['unauthorized', 'device-disconnected', 'no-sound']
  terminal.forEach((reason) => {
    it(`${reason} => unavailable, attempts NOT incremented, reason preserved`, () => {
      let s = bothLiveState()
      s = onDisconnected(s, 'microphone', { reason, now: 50 })
      expect(s.microphone.status).toBe('unavailable')
      expect(s.microphone.reconnectAttempts).toBe(0)
      expect(s.microphone.reason).toBe(reason)
      expect(openGaps(s, 'microphone')).toEqual([{ startedAt: 50, endedAt: null }])
    })
  })
})

describe('all five reasons are distinguishable and preserved', () => {
  const reasons: DisconnectReason[] = [
    'no-sound',
    'unauthorized',
    'device-disconnected',
    'network',
    'asr-rejected'
  ]
  reasons.forEach((reason) => {
    it(`preserves reason '${reason}' on the source state`, () => {
      let s = bothLiveState()
      s = onDisconnected(s, 'system', { reason, now: 60 })
      expect(s.system.reason).toBe(reason)
    })
  })
})

describe('gap timeline', () => {
  it('a second disconnect after a reconnect opens a new gap, not the old one', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 70 })
    s = onConnected(s, 'system', 80)
    s = onDisconnected(s, 'system', { reason: 'network', now: 90 })
    expect(s.system.gaps).toEqual([
      { startedAt: 70, endedAt: 80 },
      { startedAt: 90, endedAt: null }
    ])
    expect(openGaps(s, 'system')).toEqual([{ startedAt: 90, endedAt: null }])
  })

  it('a disconnect while already disconnected does not open a second gap', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 70 })
    s = onDisconnected(s, 'system', { reason: 'asr-rejected', now: 75 })
    expect(s.system.gaps).toEqual([{ startedAt: 70, endedAt: null }])
    // attempts still increment on each transient disconnect
    expect(s.system.reconnectAttempts).toBe(2)
  })
})

describe('onReconnecting', () => {
  it('bumps reconnect attempts', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 70 })
    expect(s.system.reconnectAttempts).toBe(1)
    s = onReconnecting(s, 'system', 71)
    expect(s.system.reconnectAttempts).toBe(2)
    expect(s.system.status).toBe('reconnecting')
  })
})

describe('onExhausted', () => {
  it('marks unavailable but keeps the gap open', () => {
    let s = bothLiveState()
    s = onDisconnected(s, 'system', { reason: 'network', now: 70 })
    s = onExhausted(s, 'system', 80)
    expect(s.system.status).toBe('unavailable')
    expect(openGaps(s, 'system')).toEqual([{ startedAt: 70, endedAt: null }])
  })
})

describe('selectors', () => {
  it('anyLive / bothLive reflect live sources', () => {
    let s = bothLiveState()
    expect(anyLive(s)).toBe(true)
    expect(bothLive(s)).toBe(true)
    s = onDisconnected(s, 'system', { reason: 'network', now: 20 })
    expect(bothLive(s)).toBe(false)
    expect(anyLive(s)).toBe(true)
  })

  it('allDown treats connecting/reconnecting as still up', () => {
    let s = createDualAudioState()
    s = onConnecting(s, 'system', 1)
    expect(allDown(s)).toBe(false)
    s = onDisconnected(s, 'system', { reason: 'network', now: 2 })
    // microphone still idle (down), system reconnecting (up) => not all down
    expect(allDown(s)).toBe(false)
    s = onExhausted(s, 'system', 3)
    expect(allDown(s)).toBe(true)
  })
})

describe('purity', () => {
  it('reducers never mutate their input', () => {
    const s0 = createDualAudioState()
    const snapshot = JSON.stringify(s0)
    onConnecting(s0, 'system', 5)
    onConnected(s0, 'system', 6)
    onDisconnected(s0, 'system', { reason: 'network', now: 7 })
    onReconnecting(s0, 'system', 8)
    onExhausted(s0, 'system', 9)
    expect(JSON.stringify(s0)).toBe(snapshot)
  })

  it('does not mutate nested gaps arrays across a disconnect/reconnect cycle', () => {
    const live = bothLiveState()
    const disconnected = onDisconnected(live, 'system', { reason: 'network', now: 20 })
    expect(live.system.gaps).toEqual([])
    const reconnected = onConnected(disconnected, 'system', 30)
    // the disconnected snapshot's open gap is untouched by the reconnect
    expect(disconnected.system.gaps).toEqual([{ startedAt: 20, endedAt: null }])
    expect(reconnected.system.gaps).toEqual([{ startedAt: 20, endedAt: 30 }])
  })
})

describe('source module has no clock/random usage', () => {
  it('never references Date.now or Math.random in the module source', async () => {
    const fs = await import('node:fs')
    const url = await import('node:url')
    const path = await import('node:path')
    const here = path.dirname(url.fileURLToPath(import.meta.url))
    const src = fs.readFileSync(path.join(here, '../src/shared/audio-source-machine.ts'), 'utf8')
    expect(src).not.toMatch(/Date\.now/)
    expect(src).not.toMatch(/Math\.random/)
  })
})
