/** Pure decision logic for "reliable streaming generation" (可靠流式生成).

   The app streams AI answers; a stream can fail part-way for very different
   reasons, and each reason needs a different recovery. This module is ONLY the
   decision logic — it classifies a failure, computes a deterministic backoff,
   and picks a recovery strategy. It does no I/O and owns no streaming: the
   caller feeds in the raw error and the current attempt bookkeeping, and acts
   on the returned strategy.

   Everything here is deterministic: no wall-clock reads, no randomness, no
   timers. Any time base (backoff base) is passed in so tests can pin exact
   values. */

export type FailureKind =
  | 'rate-limited'
  | 'timeout'
  | 'network'
  | 'model-unavailable'
  | 'aborted'
  | 'unknown'

export type RecoveryStrategy =
  | { kind: 'retry-after'; delayMs: number }
  | { kind: 'retry-now' }
  | { kind: 'switch-model' }
  | { kind: 'give-up'; reason: string }

export interface RetryState {
  /** 1-based number of the attempt that just failed. */
  attempt: number
  /** Total attempts allowed before we give up. */
  maxAttempts: number
}

export interface FailureInput {
  statusCode?: number
  message?: string
  name?: string
}

/** Cap on the exponential backoff so a large attempt count can't ask us to
   wait for minutes. */
export const MAX_BACKOFF_MS = 30000

const TIMEOUT_MESSAGE_HINTS = ['ai_stream_timeout', 'timeout', 'timed out', 'etimedout']
const NETWORK_MESSAGE_HINTS = ['fetch failed', 'econnrefused', 'enotfound', 'econnreset', 'network']
const MODEL_UNAVAILABLE_HINTS = [
  'model not found',
  'no such model',
  'unknown model',
  'unsupported model'
]
const RATE_LIMIT_MESSAGE_HINTS = ['rate limit', 'rate-limit', 'too many requests']
const USER_ABORT_HINTS = [
  'user-aborted',
  'user aborted',
  'aborted by user',
  'cancelled by user',
  'canceled by user'
]

const includesAny = (haystack: string, needles: string[]): boolean =>
  needles.some((n) => haystack.includes(n))

/** Detect an explicit *user* abort, as opposed to a timeout-driven abort.
   A timeout aborts the controller too and often surfaces as an AbortError, so
   user aborts must be signalled distinctly (a dedicated name or message). */
const isUserAbort = (name: string, message: string): boolean =>
  name === 'userabort' || name === 'useraborterror' || includesAny(message, USER_ABORT_HINTS)

const isTimeout = (name: string, message: string): boolean =>
  name === 'aborterror' || name === 'timeouterror' || includesAny(message, TIMEOUT_MESSAGE_HINTS)

/** Classify a raw failure into a single FailureKind.

   Precedence (first match wins), from most authoritative to most heuristic:
     1. explicit user abort — user intent overrides every other signal
     2. statusCode 429 — an authoritative rate-limit status
     3. statusCode 404 — an authoritative "no such model/route" status
     4. timeout — AbortError/TimeoutError name or a timeout message
        (a timeout-driven AbortError is a timeout, not a user abort)
     5. model-unavailable by message ("model not found", ...)
     6. rate-limited by message ("rate limit", "too many requests")
     7. network by message ("fetch failed", ECONNREFUSED, ...)
     8. otherwise 'unknown'

   Status codes are checked before name/message heuristics so a 429 wins over
   an incidental "timeout" word, and a user abort wins over everything. */
export function classifyFailure(input: FailureInput): FailureKind {
  const name = (input.name ?? '').toLowerCase()
  const message = (input.message ?? '').toLowerCase()

  if (isUserAbort(name, message)) return 'aborted'
  if (input.statusCode === 429) return 'rate-limited'
  if (input.statusCode === 404) return 'model-unavailable'
  if (isTimeout(name, message)) return 'timeout'
  if (includesAny(message, MODEL_UNAVAILABLE_HINTS)) return 'model-unavailable'
  if (includesAny(message, RATE_LIMIT_MESSAGE_HINTS)) return 'rate-limited'
  if (includesAny(message, NETWORK_MESSAGE_HINTS)) return 'network'
  return 'unknown'
}

/** Deterministic exponential backoff: baseMs * 2^(attempt-1), capped at
   MAX_BACKOFF_MS. No jitter/random so the value is fully reproducible. Attempts
   below 1 are treated as 1 (delay never goes below baseMs). */
export function backoffDelayMs(attempt: number, baseMs = 500): number {
  const safeAttempt = attempt < 1 ? 1 : attempt
  const raw = baseMs * 2 ** (safeAttempt - 1)
  return Math.min(raw, MAX_BACKOFF_MS)
}

/** Pick a recovery strategy for a classified failure given retry bookkeeping.

   - rate-limited: back off and retry while attempts remain, else give up.
   - timeout / network: immediate single retry while attempts remain, else give up.
   - model-unavailable: never blind-retry — prompt to switch model.
   - aborted: give up (the user asked us to stop).
   - unknown: allow exactly ONE immediate retry (the first failure), then give
     up — we can't be confident it's transient, so we don't burn all attempts. */
export function decideRecovery(kind: FailureKind, state: RetryState): RecoveryStrategy {
  const hasAttemptsLeft = state.attempt < state.maxAttempts

  switch (kind) {
    case 'rate-limited':
      return hasAttemptsLeft
        ? { kind: 'retry-after', delayMs: backoffDelayMs(state.attempt) }
        : { kind: 'give-up', reason: 'rate-limit-retries-exhausted' }
    case 'timeout':
    case 'network':
      return hasAttemptsLeft
        ? { kind: 'retry-now' }
        : { kind: 'give-up', reason: 'retries-exhausted' }
    case 'model-unavailable':
      return { kind: 'switch-model' }
    case 'aborted':
      return { kind: 'give-up', reason: 'user-aborted' }
    case 'unknown':
      return state.attempt < 2 && hasAttemptsLeft
        ? { kind: 'retry-now' }
        : { kind: 'give-up', reason: 'unknown-error' }
  }
}

/** Whether the partial output already streamed should be kept on this failure.

   The spec requires interruptions to retain the already-generated part, so any
   failure that can happen mid-stream after tokens flowed preserves it:
   timeout, network, aborted, unknown. rate-limited and model-unavailable are
   rejected up front (before any token is produced), so there is nothing to
   preserve and we return false. */
export function shouldPreservePartial(kind: FailureKind): boolean {
  return kind === 'timeout' || kind === 'network' || kind === 'aborted' || kind === 'unknown'
}

/** Advance the retry bookkeeping after a failed attempt. attempt increments but
   is clamped at maxAttempts so the value never overshoots; the caller decides
   whether attempts remain (via decideRecovery). */
export function nextRetryState(state: RetryState): RetryState {
  return {
    attempt: Math.min(state.attempt + 1, state.maxAttempts),
    maxAttempts: state.maxAttempts
  }
}
