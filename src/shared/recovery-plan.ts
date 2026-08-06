/** Layered reset & session recovery ("会话恢复与故障恢复").

   When something goes wrong the app should reset the SMALLEST scope that fixes
   it, not nuke everything. There is a ladder of reset scopes from cheapest to
   most drastic; a bigger reset subsumes every smaller fix below it, so when
   several symptoms are present the most-drastic REQUIRED scope wins.

   All functions here are pure and deterministic (no Date.now/Math.random). */

export type ResetScope =
  | 'retry-request' // cheapest: just re-run the failed request
  | 'reset-question' // reset the current question turn
  | 'restart-audio' // restart audio capture / ASR
  | 'reload-renderer' // rebuild the renderer window
  | 'restore-window' // recover window visibility/position
  | 'end-session' // most drastic: end the whole interview

/** Reset scopes ordered cheapest -> most drastic. Severity ranking and the
    escalation path are both derived from this single source of truth. */
export const RESET_LADDER: readonly ResetScope[] = [
  'retry-request',
  'reset-question',
  'restart-audio',
  'reload-renderer',
  'restore-window',
  'end-session'
] as const

export interface RecoverableProblem {
  // what's broken — drives which scope is the minimal fix
  failedRequest?: boolean
  questionCorrupt?: boolean
  audioStuck?: boolean
  rendererUnresponsive?: boolean
  windowInvisible?: boolean
  sessionCorrupt?: boolean
}

/** Severity ordering, mirroring RESET_LADDER (drastic wins when multiple are
    present because a bigger reset subsumes the smaller fixes). Highest severity
    first so the first matching symptom is the most-drastic required scope. */
const SEVERITY_ORDER: readonly { key: keyof RecoverableProblem; scope: ResetScope }[] = [
  { key: 'sessionCorrupt', scope: 'end-session' },
  { key: 'windowInvisible', scope: 'restore-window' },
  { key: 'rendererUnresponsive', scope: 'reload-renderer' },
  { key: 'audioStuck', scope: 'restart-audio' },
  { key: 'questionCorrupt', scope: 'reset-question' },
  { key: 'failedRequest', scope: 'retry-request' }
]

/** Index of a scope in the ladder (cheapest = 0, ascending to most drastic). */
export function scopeRank(scope: ResetScope): number {
  return RESET_LADDER.indexOf(scope)
}

/** Pick the CHEAPEST scope that still addresses the highest-severity symptom
    present. When several are set the most-drastic required one wins, since it
    subsumes the smaller fixes below it. Returns null when nothing is broken. */
export function minimalScopeFor(problem: RecoverableProblem): ResetScope | null {
  for (const { key, scope } of SEVERITY_ORDER) {
    if (problem[key]) return scope
  }
  return null
}

/** Next more-drastic scope up the ladder (for when a reset didn't work), or
    null once we're already past the most drastic scope. */
export function escalate(scope: ResetScope): ResetScope | null {
  const next = scopeRank(scope) + 1
  if (next <= 0 || next >= RESET_LADDER.length) return null
  return RESET_LADDER[next]
}

/** Whether, after applying fixedScope, the original task can auto-resume. The
    spec: after fixing, auto-continue the original task; don't force the user to
    re-screenshot or re-type. Only ending the whole session cannot resume. */
export function canContinueAfterFix(_problem: RecoverableProblem, fixedScope: ResetScope): boolean {
  return fixedScope !== 'end-session'
}

/** Error text must NOT be injected into context as a real assistant answer.
    Modeled as an explicit always-false rule regardless of the input. */
export function shouldInjectAsAssistantAnswer(isErrorText: boolean): boolean {
  void isErrorText
  return false
}
