/** Secret four-state lifecycle ("密钥四态生命周期").
 *
 * Models the renderer-visible state machine for managing a stored secret such
 * as the AI API key or the DashScope ASR key. The design contract:
 *
 *   1. The full raw secret NEVER round-trips to the renderer. Only a masked
 *      suffix (the last 4 chars) is exposed for the user to recognize their
 *      key. Actual secret persistence lives in the main process (safeStorage);
 *      this module is the PURE state machine only — no IO, no Date.now, no
 *      Math.random, no secret storage.
 *   2. Replace / cancel / delete are INDEPENDENT operations. Clearing an input
 *      field must never be mistaken for a delete.
 *   3. Delete must clear both main-process memory and secure storage (the
 *      caller performs the actual erase), so a delete after restart can never
 *      resurrect the old key.
 *
 * The UI only ever shows four phases:
 *   - 'unset'          — no secret saved
 *   - 'saved'          — a secret is saved (maskedSuffix shown)
 *   - 'replacing'      — the user is entering a new secret (old suffix still shown)
 *   - 'pending-delete' — the user asked to delete and must confirm
 */

export type SecretPhase = 'unset' | 'saved' | 'replacing' | 'pending-delete'

export interface SecretState {
  phase: SecretPhase
  /** e.g. '7F3A' — last 4 chars of the saved secret, shown to the user.
     The raw secret is NEVER stored on this state object. */
  maskedSuffix: string | null
}

/** Transient input buffer that lives renderer-side while the user types a new
   secret. Kept separate from SecretState so the raw input never leaks into the
   persisted / synced state. */
export interface SecretDraft {
  input: string
}

/** Build the initial state. 'saved' with the given suffix when a secret already
   exists, otherwise 'unset' with no suffix. */
export function createSecretState(hasSaved: boolean, maskedSuffix?: string): SecretState {
  if (hasSaved) return { phase: 'saved', maskedSuffix: maskedSuffix ?? null }
  return { phase: 'unset', maskedSuffix: null }
}

/** Derive the masked suffix (last 4 chars, or the whole string when shorter)
   from a raw secret. Called in the MAIN process only — the raw string is passed
   in solely to compute the mask and is discarded by the caller afterwards; it
   is never returned to or stored by the renderer. */
export function maskSecret(raw: string): string {
  return raw.slice(-4)
}

/** 'saved' -> 'replacing'. Keeps the old maskedSuffix so the UI keeps showing
   the current key until a new one is applied. Any other phase is returned
   unchanged. */
export function beginReplace(state: SecretState): SecretState {
  if (state.phase !== 'saved') return state
  return { phase: 'replacing', maskedSuffix: state.maskedSuffix }
}

/** 'replacing' -> restore. Returns to 'saved' when a previous suffix exists,
   otherwise 'unset'. This is a pure cancel: it never deletes. Clearing the
   draft input is a SEPARATE concern handled by the caller. */
export function cancelReplace(state: SecretState): SecretState {
  if (state.phase !== 'replacing') return state
  if (state.maskedSuffix === null) return { phase: 'unset', maskedSuffix: null }
  return { phase: 'saved', maskedSuffix: state.maskedSuffix }
}

/** 'replacing' -> 'saved' with the new suffix (computed via maskSecret in main). */
export function applyReplace(state: SecretState, newMaskedSuffix: string): SecretState {
  if (state.phase !== 'replacing') return state
  return { phase: 'saved', maskedSuffix: newMaskedSuffix }
}

/** 'saved' -> 'pending-delete'. Suffix is kept so the UI can still show which
   key is about to be removed while the user confirms. */
export function markPendingDelete(state: SecretState): SecretState {
  if (state.phase !== 'saved') return state
  return { phase: 'pending-delete', maskedSuffix: state.maskedSuffix }
}

/** 'pending-delete' -> 'unset' with maskedSuffix null. The caller must also
   clear both main-process memory and secure storage; this returns the cleared
   UI state only. */
export function confirmDelete(state: SecretState): SecretState {
  if (state.phase !== 'pending-delete') return state
  return { phase: 'unset', maskedSuffix: null }
}

/** 'pending-delete' -> 'saved' (undo). Restores the previously shown suffix. */
export function cancelDelete(state: SecretState): SecretState {
  if (state.phase !== 'pending-delete') return state
  return { phase: 'saved', maskedSuffix: state.maskedSuffix }
}

/** Contract guard: emptying the input field is NOT a delete. Callers must
   invoke markPendingDelete + confirmDelete explicitly to remove a secret. */
export function isClearedInputADelete(): false {
  return false
}

/** Emptying the input never transitions the lifecycle — the phase is returned
   unchanged. Deleting requires the explicit markPendingDelete + confirmDelete
   flow, never an empty input buffer. */
export function interpretEmptyInput(phase: SecretPhase): SecretPhase {
  return phase
}

/** Contract guard: the full secret never returns to the renderer. Always false;
   the renderer only ever sees the masked suffix. */
export function exposesRawToRenderer(): false {
  return false
}
