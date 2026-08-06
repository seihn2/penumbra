// Bridge from the audio-source-machine's DualAudioState to AttentionEvents, so
// the renderer can route audio reliability through the single AttentionGovernor
// (attention-event.ts) instead of raising ad-hoc toasts. Pure: no IO, no clock.

import {
  allDown,
  anyLive,
  type DisconnectReason,
  type DualAudioState,
  type SourceState
} from './audio-source-machine'
import {
  AUDIO_ALL_DISCONNECTED_SOURCE,
  type AttentionEvent,
  type AttentionSeverity
} from './attention-event'

/** A terminal reason means the user must act (permissions/hardware); a
   transient one may still recover on its own. Terminal single-source drops are
   worth a (non-preempting) warning; transient blips stay quiet. */
const TERMINAL_REASONS: DisconnectReason[] = ['unauthorized', 'device-disconnected', 'asr-rejected']

function severityForReason(reason: DisconnectReason): AttentionSeverity {
  return TERMINAL_REASONS.includes(reason) ? 'warn' : 'info'
}

/** Derive the attention events implied by the current dual-audio state.

   - When BOTH sources are down (the app is effectively deaf), emit ONE critical
     event using the sentinel source so the governor preempts the user.
   - Otherwise, for each source that is not live and has a terminal reason, emit
     a single non-preempting 'audio' warning so it lands in the "later" queue.
   - A fully healthy state (at least one source live, no terminal drops) yields
     no events. */
export function audioAttentionEvents(state: DualAudioState): AttentionEvent[] {
  if (allDown(state)) {
    return [
      {
        id: 'audio-all',
        source: AUDIO_ALL_DISCONNECTED_SOURCE,
        severity: 'critical',
        affectedCapability: 'audio',
        requiresImmediate: true,
        dedupeKey: 'audio-all',
        mayInterruptSpeech: true
      }
    ]
  }

  const events: AttentionEvent[] = []
  // If at least one source is live the app can still hear; only surface a
  // terminal drop on the OTHER source as a low-priority heads-up.
  const stillHearing = anyLive(state)
  for (const source of [state.system, state.microphone] as SourceState[]) {
    if (source.status === 'live') continue
    if (source.reason === 'none') continue
    if (!TERMINAL_REASONS.includes(source.reason)) continue
    // When nothing is live at all this branch is unreachable (allDown handled
    // above); this guard keeps intent explicit if that changes.
    if (!stillHearing) continue
    events.push({
      id: `audio-${source.role}`,
      source: `audio-${source.role}`,
      severity: severityForReason(source.reason),
      affectedCapability: 'audio',
      requiresImmediate: false,
      dedupeKey: `audio-${source.role}`,
      mayInterruptSpeech: false
    })
  }
  return events
}
