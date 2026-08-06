/** Config dependency graph — decide each control's effective status so the UI
   can surface "on but silently non-functional" settings. Every control reports
   whether it works right now, is missing a dependency (e.g. translation with no
   AI key), is overridden by another setting, is locked for the current session,
   needs a restart to take effect, or isn't implemented in this version.

   Everything here is pure: no Date.now / Math.random / I/O, so the same inputs
   always map to the same status (see the determinism test). */

export type ControlStatus =
  | 'effective' // works right now
  | 'missing-dependency' // enabled but a required dependency is absent
  | 'overridden' // another setting overrides it
  | 'session-locked' // can't change mid-session
  | 'needs-restart' // takes effect after restart-transcription/app
  | 'unsupported' // not implemented in this version

export interface ControlSpec {
  id: string
  requires?: string[] // ids of settings/flags that must be truthy
  overriddenBy?: string // id of a setting that, when set, overrides this
  sessionLocked?: boolean
  needsRestart?: boolean
  supported?: boolean // default true; false => 'unsupported'
}

/** Current values/flags keyed by setting id. Values are unknown because the
   snapshot mixes booleans, strings, numbers and absent keys. */
export type SettingsSnapshot = Record<string, unknown>

export interface EvaluateOptions {
  sessionActive?: boolean
}

/** Truthiness used for dependency/override checks. undefined/null/false/''/0
   are false; a non-empty string, true, or any non-zero number is true. NaN is
   treated as false (it fails the != 0 check like an absent value). */
export function isTruthy(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.length > 0
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v)
  // Objects, arrays, functions, etc. are considered present/truthy.
  return true
}

/** Evaluate a single control against the current settings snapshot.

   Precedence (highest first):
   1. unsupported     — supported === false (nothing else can rescue it)
   2. overridden      — overriddenBy is set AND that setting is truthy
   3. missing-dependency — any id in requires is not truthy
   4. session-locked  — sessionLocked && opts.sessionActive
   5. needs-restart   — needsRestart
   6. effective       — dependencies met, nothing blocks it */
export function evaluateControl(
  spec: ControlSpec,
  settings: SettingsSnapshot,
  opts: EvaluateOptions = {}
): ControlStatus {
  if (spec.supported === false) return 'unsupported'

  if (spec.overriddenBy && isTruthy(settings[spec.overriddenBy])) return 'overridden'

  if (spec.requires && spec.requires.some((id) => !isTruthy(settings[id]))) {
    return 'missing-dependency'
  }

  if (spec.sessionLocked && opts.sessionActive === true) return 'session-locked'

  if (spec.needsRestart) return 'needs-restart'

  return 'effective'
}

/** Evaluate many controls at once, keyed by control id. */
export function evaluateAll(
  specs: ControlSpec[],
  settings: SettingsSnapshot,
  opts: EvaluateOptions = {}
): Record<string, ControlStatus> {
  const result: Record<string, ControlStatus> = {}
  for (const spec of specs) {
    result[spec.id] = evaluateControl(spec, settings, opts)
  }
  return result
}

/** Stable machine-readable reason code for i18n keying. The reason IS the
   status (trivial passthrough), so callers key translations off one enum. */
export function explain(status: ControlStatus): ControlStatus {
  return status
}

/** Control ids the user can actually fix right now — those blocked purely by a
   missing dependency (e.g. add the AI key). Other statuses aren't listed
   because they need a restart, a session end, or a code change instead. */
export function actionableControls(map: Record<string, ControlStatus>): string[] {
  return Object.keys(map).filter((id) => map[id] === 'missing-dependency')
}

/** Which controls require the given setting id — used to show ripple effects
   ("turning this off will break X and Y"). */
export function dependents(specs: ControlSpec[], settingId: string): string[] {
  return specs.filter((spec) => spec.requires?.includes(settingId)).map((spec) => spec.id)
}
