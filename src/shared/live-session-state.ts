/** Live session state: the single source of truth for "what is happening right
   now" in an interview, owned by the main process (not any React page) so it
   survives renderer reloads and route changes. This module is the PURE core —
   the snapshot shape plus the reducer that maps raw facts to the one
   user-facing capsule status. The stateful kernel that owns timers, providers,
   and IPC lives in the main process and builds on these types.

   Pure: no Date.now()/Math.random(); callers pass timestamps. */

export type AudioSourceStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'unavailable'

export type LiveSessionPhase =
  | 'idle' // nothing running
  | 'listening' // transcribing, waiting for a question
  | 'preparing' // a question arrived, assist is being generated
  | 'ready' // answer points are ready
  | 'recording-answer' // the candidate is speaking their answer
  | 'audio-interrupted' // all audio sources dropped — needs attention

export interface LiveSessionSnapshot {
  /** Whether an interview session is active at all. */
  active: boolean
  /** Per-source ASR status. */
  audio: { system: AudioSourceStatus; microphone: AudioSourceStatus }
  /** True while at least one assist stream is in flight. */
  assistInFlight: boolean
  /** True when answer points are available for the current question. */
  hasReadyAnswer: boolean
  /** True when the candidate (microphone) is currently speaking. */
  candidateSpeaking: boolean
  /** Session start timestamp (ms) or null when not started. */
  startedAt: number | null
}

export function createLiveSnapshot(): LiveSessionSnapshot {
  return {
    active: false,
    audio: { system: 'idle', microphone: 'idle' },
    assistInFlight: false,
    hasReadyAnswer: false,
    candidateSpeaking: false,
    startedAt: null
  }
}

/** True when neither audio source is in a working/attempting state. */
export function allAudioDown(audio: LiveSessionSnapshot['audio']): boolean {
  const working: AudioSourceStatus[] = ['connecting', 'live', 'reconnecting']
  return !working.includes(audio.system) && !working.includes(audio.microphone)
}

/** Any source live or attempting to connect. */
export function anyAudioActive(audio: LiveSessionSnapshot['audio']): boolean {
  return !allAudioDown(audio)
}

/** Map a raw snapshot to the SINGLE capsule phase shown on the overlay. Exactly
   one phase at a time — the priority order encodes what matters most:
   1. Not active → idle.
   2. Audio was running but all sources dropped → audio-interrupted (needs the
      user's attention over everything else).
   3. Candidate is speaking → recording-answer.
   4. Answer points ready → ready.
   5. Assist in flight → preparing.
   6. Otherwise, actively listening. */
export function deriveLivePhase(snapshot: LiveSessionSnapshot): LiveSessionPhase {
  if (!snapshot.active) return 'idle'
  if (allAudioDown(snapshot.audio)) return 'audio-interrupted'
  if (snapshot.candidateSpeaking) return 'recording-answer'
  if (snapshot.hasReadyAnswer) return 'ready'
  if (snapshot.assistInFlight) return 'preparing'
  return 'listening'
}

/** Elapsed session time in ms, given the current clock. 0 when not started or
   when now precedes startedAt (clock skew guard). */
export function sessionElapsedMs(snapshot: LiveSessionSnapshot, now: number): number {
  if (snapshot.startedAt == null) return 0
  return Math.max(0, now - snapshot.startedAt)
}
