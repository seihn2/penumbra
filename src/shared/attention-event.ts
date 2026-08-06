/** AttentionGovernor — a pure model that unifies every notification the app can
   raise (audio drops, stream failures, stealth toggles, question conflicts,
   informational hints, …) into a single `AttentionEvent` shape and decides,
   with no side effects, which events are urgent enough to PREEMPT the user
   right now versus which should be collapsed and queued for LATER.

   Keeping this logic pure and framework-free means the "an event must never
   show up in a Toast AND a banner AND the Coach panel at the same time" rule
   and the "only four kinds of thing may interrupt the candidate" rule are both
   unit-testable in isolation from Electron/React. */

export type AttentionSeverity = 'info' | 'warn' | 'critical'

export interface AttentionEvent {
  id: string
  source: string
  severity: AttentionSeverity
  /** The user-facing capability this event is about, e.g.
     'audio' | 'answer' | 'stealth' | 'question'. Free-form so new sources can
     participate, but the four preempt rules below key off these known values. */
  affectedCapability: string
  requiresImmediate: boolean
  /** Events sharing a dedupeKey are considered the SAME concern; `dedupe`
     collapses them to a single event so one issue can't surface three times. */
  dedupeKey: string
  recoveryAction?: string
  mayInterruptSpeech: boolean
}

/** The single sentinel source that represents "every audio source is gone".
   The caller is expected to emit exactly this source for the total-audio-loss
   condition, so a single flaky source (still `affectedCapability: 'audio'` but
   a different source) does NOT preempt. */
export const AUDIO_ALL_DISCONNECTED_SOURCE = 'audio-all-disconnected'

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  info: 0,
  warn: 1,
  critical: 2
}

/** Ordinal for a severity so callers can compare/sort (critical > warn > info). */
export function severityRank(sev: AttentionSeverity): number {
  return SEVERITY_RANK[sev]
}

/** Decide whether an event is allowed to interrupt the user immediately.

   ONLY these four conditions preempt; everything else is routed to the "later"
   queue. Each condition is deliberately narrow and independently testable:

   1. All audio sources disconnected — the app is effectively deaf. Represented
      as a critical audio event whose source is AUDIO_ALL_DISCONNECTED_SOURCE
      (a single dropped source alone must NOT preempt).
   2. The current answer stream cannot continue — a critical 'answer' event.
   3. Stealth / content-protection was turned off — any 'stealth' event, at any
      severity, because even losing invisibility for a moment is dangerous.
   4. The current question is in conflict — a critical 'question' event. */
export function shouldPreempt(event: AttentionEvent): boolean {
  const { affectedCapability, severity, source } = event

  // 1. All audio sources disconnected.
  if (
    affectedCapability === 'audio' &&
    severity === 'critical' &&
    source === AUDIO_ALL_DISCONNECTED_SOURCE
  ) {
    return true
  }

  // 2. Current answer cannot continue.
  if (affectedCapability === 'answer' && severity === 'critical') {
    return true
  }

  // 3. Stealth / content-protection turned off (any severity).
  if (affectedCapability === 'stealth') {
    return true
  }

  // 4. Current question conflict.
  if (affectedCapability === 'question' && severity === 'critical') {
    return true
  }

  return false
}

/** Collapse events that share a `dedupeKey`, keeping the highest-severity
   representative of each key. This guarantees a single concern surfaces once
   rather than simultaneously in Toast + banner + Coach.

   - Order is stable: the first occurrence of each key fixes its slot; a later,
     higher-severity duplicate replaces the value in place without reordering.
   - On a severity tie the earlier event wins (first-seen is kept).
   - The input array and its events are never mutated (kept representatives are
     returned by reference; no field is written). */
export function dedupe(events: AttentionEvent[]): AttentionEvent[] {
  const order: string[] = []
  const chosen = new Map<string, AttentionEvent>()

  for (const event of events) {
    const existing = chosen.get(event.dedupeKey)
    if (existing === undefined) {
      order.push(event.dedupeKey)
      chosen.set(event.dedupeKey, event)
      continue
    }
    if (severityRank(event.severity) > severityRank(existing.severity)) {
      chosen.set(event.dedupeKey, event)
    }
  }

  return order.map((key) => chosen.get(key) as AttentionEvent)
}

export interface AttentionPartition {
  preempting: AttentionEvent[]
  later: AttentionEvent[]
}

/** Deduplicate, then split the events into those allowed to preempt now and
   those queued for later, preserving each group's relative order. Pure: does
   not mutate the input array or any event. */
export function partition(events: AttentionEvent[]): AttentionPartition {
  const preempting: AttentionEvent[] = []
  const later: AttentionEvent[] = []

  for (const event of dedupe(events)) {
    if (shouldPreempt(event)) {
      preempting.push(event)
    } else {
      later.push(event)
    }
  }

  return { preempting, later }
}
