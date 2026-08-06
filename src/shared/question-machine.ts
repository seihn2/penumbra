/** Current-question state machine ("当前问题状态机"): the PURE core that tracks
   which interviewer question is being answered vs newly detected vs queued, and
   tags every entry with a (turnId, revision) pair so a late/stale AI response
   can never overwrite a newer question.

   The interviewer talks continuously; the transcript is noisy. Two things must
   always hold:
   1. At most ONE question is 'active' at a time (the one being answered).
   2. Every AI request is stamped with the entry's turnId + revision. When a
      response comes back, isStaleResponse() decides whether to drop it because
      the machine has moved on (turn expired, gone, or the question was amended
      to a newer revision).

   Pure: no Date.now()/Math.random(). Callers pass `now` where a timestamp is
   stamped, and turnIds are derived from a monotonic `seq` for determinism.
   Reducers never mutate inputs — they return fresh state. */

export type QuestionStatus = 'active' | 'incoming' | 'queued' | 'answering' | 'expired'

export interface QuestionEntry {
  turnId: string
  /** Bumped whenever the question text is amended/refined or folded into. */
  revision: number
  text: string
  status: QuestionStatus
  createdAt: number
}

export interface QuestionMachine {
  /** Ordered oldest -> newest. */
  entries: QuestionEntry[]
  activeTurnId: string | null
  /** Monotonic counter driving deterministic turnIds. */
  seq: number
}

/** Statuses that represent a question waiting for its turn to become active. */
const PENDING_STATUSES: QuestionStatus[] = ['incoming', 'queued']

export function createMachine(): QuestionMachine {
  return { entries: [], activeTurnId: null, seq: 0 }
}

/** The active entry, or null when nothing is being answered. */
export function currentQuestion(machine: QuestionMachine): QuestionEntry | null {
  if (machine.activeTurnId == null) return null
  return machine.entries.find((entry) => entry.turnId === machine.activeTurnId) ?? null
}

function findEntry(machine: QuestionMachine, turnId: string): QuestionEntry | undefined {
  return machine.entries.find((entry) => entry.turnId === turnId)
}

/** Append a NEW question. Rule: if no question is currently active it becomes
   'active' immediately; otherwise it enters as 'incoming' and waits (queued
   behind the active one). The turnId is derived from the monotonic seq. */
export function detectQuestion(
  machine: QuestionMachine,
  { text, now }: { text: string; now: number }
): QuestionMachine {
  const nextSeq = machine.seq + 1
  const turnId = `q-${nextSeq}`
  const hasActive = currentQuestion(machine) != null
  const status: QuestionStatus = hasActive ? 'incoming' : 'active'
  const entry: QuestionEntry = { turnId, revision: 0, text, status, createdAt: now }
  return {
    entries: [...machine.entries, entry],
    activeTurnId: hasActive ? machine.activeTurnId : turnId,
    seq: nextSeq
  }
}

/** The interviewer added a clarifying condition to the SAME question ("不是新问
   题，是补充条件"): bump that entry's revision and replace its text. No new turn
   is created. Unknown turnIds are a no-op. */
export function amendQuestion(
  machine: QuestionMachine,
  turnId: string,
  { text }: { text: string }
): QuestionMachine {
  if (findEntry(machine, turnId) == null) return machine
  return {
    ...machine,
    entries: machine.entries.map((entry) =>
      entry.turnId === turnId ? { ...entry, revision: entry.revision + 1, text } : entry
    )
  }
}

/** Promote the oldest pending ('incoming'/'queued') entry to 'active'. Any
   other pending entries are normalised to 'queued'. The previously active entry
   (if still present and not expired) is left as-is by the caller — promoteNext
   is meant to run after the active entry has been expired/answered, so it does
   not force-demote a live active entry. If a question is already active and not
   expired, this is a no-op. */
export function promoteNext(machine: QuestionMachine): QuestionMachine {
  const active = currentQuestion(machine)
  if (active != null && active.status !== 'expired') return machine

  const next = machine.entries.find((entry) => PENDING_STATUSES.includes(entry.status))
  if (next == null) {
    return { ...machine, activeTurnId: active != null ? null : machine.activeTurnId }
  }

  const entries = machine.entries.map((entry) => {
    if (entry.turnId === next.turnId) return { ...entry, status: 'active' as QuestionStatus }
    if (PENDING_STATUSES.includes(entry.status)) {
      return { ...entry, status: 'queued' as QuestionStatus }
    }
    return entry
  })
  return { ...machine, entries, activeTurnId: next.turnId }
}

/** Mark a turn as 'answering' (the candidate is speaking their answer). Only a
   known turn is affected; unknown turnIds are a no-op. */
export function setAnswering(machine: QuestionMachine, turnId: string): QuestionMachine {
  if (findEntry(machine, turnId) == null) return machine
  return {
    ...machine,
    entries: machine.entries.map((entry) =>
      entry.turnId === turnId ? { ...entry, status: 'answering' } : entry
    )
  }
}

/** Mark a turn as 'expired' — its suggestions are stale. If it was the active
   turn, activeTurnId is cleared so a later promoteNext() can advance. Unknown
   turnIds are a no-op. */
export function expireQuestion(machine: QuestionMachine, turnId: string): QuestionMachine {
  if (findEntry(machine, turnId) == null) return machine
  const entries = machine.entries.map((entry) =>
    entry.turnId === turnId ? { ...entry, status: 'expired' as QuestionStatus } : entry
  )
  return {
    ...machine,
    entries,
    activeTurnId: machine.activeTurnId === turnId ? null : machine.activeTurnId
  }
}

/** The detected line was NOT a new question but part of the active one (a
   speaker/boundary correction): fold the separate entry's text into the active
   entry, bump the active entry's revision, and drop the separate entry. If
   there is no active entry, or the turnId is unknown or already the active
   entry, this is a no-op. */
export function mergeIntoActive(machine: QuestionMachine, turnId: string): QuestionMachine {
  const active = currentQuestion(machine)
  if (active == null || turnId === active.turnId) return machine
  const source = findEntry(machine, turnId)
  if (source == null) return machine

  const mergedText = `${active.text} ${source.text}`.trim()
  const entries = machine.entries
    .filter((entry) => entry.turnId !== turnId)
    .map((entry) =>
      entry.turnId === active.turnId
        ? { ...entry, revision: entry.revision + 1, text: mergedText }
        : entry
    )
  return { ...machine, entries }
}

/** Guard that prevents a late request from overwriting a newer question. A
   response tagged with (turnId, revision) is STALE — and must be dropped — when:
   - the turn no longer exists (was merged/removed), OR
   - that turn is expired, OR
   - the turn's CURRENT revision is greater than the response's revision (the
     question was amended/folded after the request went out).
   It is fresh (returns false) only when the turn still exists, is not expired,
   and its current revision matches the response's revision. */
export function isStaleResponse(
  machine: QuestionMachine,
  turnId: string,
  revision: number
): boolean {
  const entry = findEntry(machine, turnId)
  if (entry == null) return true
  if (entry.status === 'expired') return true
  return entry.revision > revision
}
