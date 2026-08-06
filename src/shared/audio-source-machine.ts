/** Dual-source audio reliability state machine (PURE core).

   The app captures two audio sources in parallel: 'system' (the interviewer,
   via system/loopback audio) and 'microphone' (the candidate). Each source
   drives an independent ASR websocket that can drop and must auto-reconnect
   with backoff. A failure on one source must NOT tear down the other — a full
   transcription stop is only signalled when BOTH sources are down.

   This module builds a richer per-source machine on top of the shared
   `AudioSourceStatus` from live-session-state. It is pure: reducers never
   mutate their input and never read the clock — callers pass `now`. There is
   no wall-clock or randomness anywhere here. */

import type { AudioSourceStatus } from './live-session-state'

export type AudioSourceRole = 'system' | 'microphone'

/** Why a source left the 'live' state. 'none' means it is healthy. */
export type DisconnectReason =
  | 'none'
  | 'no-sound'
  | 'unauthorized'
  | 'device-disconnected'
  | 'network'
  | 'asr-rejected'

/** A single disconnection window on a source's timeline. `endedAt` stays null
   while the gap is still open (source not yet back live). */
export interface AudioGap {
  startedAt: number
  endedAt: number | null
}

export interface SourceState {
  role: AudioSourceRole
  status: AudioSourceStatus
  reason: DisconnectReason
  reconnectAttempts: number
  lastChangeAt: number
  gaps: AudioGap[]
}

export interface DualAudioState {
  system: SourceState
  microphone: SourceState
}

/** Transient reasons are worth retrying (websocket blips / ASR backpressure);
   terminal reasons are not (the user must fix permissions or hardware, or
   there is simply no audio to hear). */
const TRANSIENT_REASONS: readonly DisconnectReason[] = ['network', 'asr-rejected']

/** Statuses that count as "working or actively trying to work". Mirrors the
   working set used by live-session-state's allAudioDown. */
const WORKING_STATUSES: readonly AudioSourceStatus[] = ['connecting', 'live', 'reconnecting']

function isTransient(reason: DisconnectReason): boolean {
  return TRANSIENT_REASONS.includes(reason)
}

function createSourceState(role: AudioSourceRole): SourceState {
  return {
    role,
    status: 'idle',
    reason: 'none',
    reconnectAttempts: 0,
    lastChangeAt: 0,
    gaps: []
  }
}

export function createDualAudioState(): DualAudioState {
  return {
    system: createSourceState('system'),
    microphone: createSourceState('microphone')
  }
}

/** Return the currently-open gap for a source, or undefined if none is open. */
function findOpenGap(source: SourceState): AudioGap | undefined {
  return source.gaps.find((gap) => gap.endedAt === null)
}

/** Build a new DualAudioState with one role replaced — never mutates input. */
function withSource(
  state: DualAudioState,
  role: AudioSourceRole,
  next: SourceState
): DualAudioState {
  return { ...state, [role]: next }
}

export function onConnecting(
  state: DualAudioState,
  role: AudioSourceRole,
  now: number
): DualAudioState {
  const source = state[role]
  return withSource(state, role, {
    ...source,
    status: 'connecting',
    lastChangeAt: now,
    gaps: source.gaps.map((gap) => ({ ...gap }))
  })
}

export function onConnected(
  state: DualAudioState,
  role: AudioSourceRole,
  now: number
): DualAudioState {
  const source = state[role]
  // Close any open gap: the source is back, so the disconnection window ends.
  const gaps = source.gaps.map((gap) =>
    gap.endedAt === null ? { ...gap, endedAt: now } : { ...gap }
  )
  return withSource(state, role, {
    ...source,
    status: 'live',
    reason: 'none',
    reconnectAttempts: 0,
    lastChangeAt: now,
    gaps
  })
}

export function onDisconnected(
  state: DualAudioState,
  role: AudioSourceRole,
  input: { reason: DisconnectReason; now: number }
): DualAudioState {
  const { reason, now } = input
  const source = state[role]
  const transient = isTransient(reason)
  // Open a fresh gap only if none is currently open — a second disconnect while
  // still disconnected keeps the original gap rather than starting another.
  const gaps = source.gaps.map((gap) => ({ ...gap }))
  if (!findOpenGap({ ...source, gaps })) {
    gaps.push({ startedAt: now, endedAt: null })
  }
  return withSource(state, role, {
    ...source,
    status: transient ? 'reconnecting' : 'unavailable',
    reason,
    reconnectAttempts: transient ? source.reconnectAttempts + 1 : source.reconnectAttempts,
    lastChangeAt: now,
    gaps
  })
}

export function onReconnecting(
  state: DualAudioState,
  role: AudioSourceRole,
  now: number
): DualAudioState {
  const source = state[role]
  return withSource(state, role, {
    ...source,
    status: 'reconnecting',
    reconnectAttempts: source.reconnectAttempts + 1,
    lastChangeAt: now,
    gaps: source.gaps.map((gap) => ({ ...gap }))
  })
}

export function onExhausted(
  state: DualAudioState,
  role: AudioSourceRole,
  now: number
): DualAudioState {
  const source = state[role]
  // Backoff gave up: mark unavailable but keep the gap open — the source is
  // still down and the disconnection window has not ended.
  return withSource(state, role, {
    ...source,
    status: 'unavailable',
    lastChangeAt: now,
    gaps: source.gaps.map((gap) => ({ ...gap }))
  })
}

export function anyLive(state: DualAudioState): boolean {
  return state.system.status === 'live' || state.microphone.status === 'live'
}

export function bothLive(state: DualAudioState): boolean {
  return state.system.status === 'live' && state.microphone.status === 'live'
}

/** True when neither source is live nor attempting to connect/reconnect. */
export function allDown(state: DualAudioState): boolean {
  return (
    !WORKING_STATUSES.includes(state.system.status) &&
    !WORKING_STATUSES.includes(state.microphone.status)
  )
}

/** Only the currently-open (unclosed) gaps for a source. */
export function openGaps(state: DualAudioState, role: AudioSourceRole): AudioGap[] {
  return state[role].gaps.filter((gap) => gap.endedAt === null)
}

/** Signal a FULL transcription stop only when every source is down. An error on
   one source alone must not stop transcription while the other still works.
   Mirrors the behavior in src/main/transcription.ts. */
export function shouldEmitFullStop(state: DualAudioState): boolean {
  return allDown(state)
}
