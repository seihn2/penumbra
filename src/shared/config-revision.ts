/** Config draft / atomic apply transaction model ("配置草稿与原子应用").

   Settings flow through three shapes: a DraftConfig the user edits freely, a
   ValidationResult that is all-or-nothing, and an ActiveConfig that is the
   currently-applied truth. Everything here is a pure function so the
   transaction semantics (immutability, atomic apply, monotonic revision) are
   testable in isolation. No Date.now() / Math.random(): callers pass any
   revision or timing they need. */

/** When a changed field actually takes effect after being applied. */
export type EffectTiming = 'immediate' | 'next-request' | 'restart-transcription' | 'next-session'

/** A single field paired with the timing at which its change takes effect. */
export interface ConfigField<T> {
  value: T
  timing: EffectTiming
}

/** The currently-applied config. `revision` increases by exactly 1 per apply. */
export interface ActiveConfig {
  revision: number
  values: Record<string, unknown>
}

/** An in-progress edit set. `base` is the active config the draft branched
   from; `edits` are pending overrides that never touch `base`. */
export interface DraftConfig {
  base: ActiveConfig
  edits: Record<string, unknown>
}

/** A validator returns an error message string, or null when the value is ok. */
export type Validator = (value: unknown) => string | null

export interface ValidationError {
  field: string
  message: string
}

export type ValidationResult =
  | { ok: true; config: ActiveConfig }
  | { ok: false; errors: ValidationError[] }

/** Build a fresh active config. Copies `values` so later mutation of the
   caller's object cannot leak in. */
export function createActiveConfig(values: Record<string, unknown>, revision = 0): ActiveConfig {
  return { revision, values: { ...values } }
}

/** Start editing from an active config. Edits begin empty; base is the active
   config unchanged (same reference is fine — it is never mutated here). */
export function startDraft(active: ActiveConfig): DraftConfig {
  return { base: active, edits: {} }
}

/** Return a new draft with one field edited. Never mutates the input draft,
   its edits, or its base/active config. */
export function editDraft(draft: DraftConfig, field: string, value: unknown): DraftConfig {
  return { base: draft.base, edits: { ...draft.edits, [field]: value } }
}

/** Merge base values with pending edits into a plain values map. */
function mergedValues(draft: DraftConfig): Record<string, unknown> {
  return { ...draft.base.values, ...draft.edits }
}

/** Validate the merged draft. Runs every validator and collects ALL errors
   (not just the first), so callers can surface a full list. When no validator
   reports a problem the result carries the config that would be applied, but
   with the SAME revision as base — applyDraft is what bumps the revision. */
export function validateDraft(
  draft: DraftConfig,
  validators: Record<string, Validator>
): ValidationResult {
  const values = mergedValues(draft)
  const errors: ValidationError[] = []
  for (const field of Object.keys(validators)) {
    const message = validators[field](values[field])
    if (message !== null) errors.push({ field, message })
  }
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, config: { revision: draft.base.revision, values } }
}

/** Atomically apply a draft on top of an active config.

   All-or-nothing: if validation reports any error the active config is left
   UNCHANGED and { ok: false, errors } is returned. On success the returned
   config has revision + 1 and base values merged with edits. The passed
   `active` and `draft` are never mutated. */
export function applyDraft(
  active: ActiveConfig,
  draft: DraftConfig,
  validators: Record<string, Validator>
): ValidationResult {
  const result = validateDraft(draft, validators)
  if (!result.ok) return result
  return {
    ok: true,
    config: { revision: active.revision + 1, values: result.config.values }
  }
}

/** Discard a draft and start over from the active config. */
export function discardDraft(active: ActiveConfig): DraftConfig {
  return startDraft(active)
}

/** Look up when a field's change takes effect. Falls back to 'immediate' when
   the field is not declared in the timing map. */
export function effectTimingFor(
  field: string,
  timingMap: Record<string, EffectTiming>
): EffectTiming {
  return timingMap[field] ?? 'immediate'
}
