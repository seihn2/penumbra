/** Personal-profile purpose-based authorization.

   Product rule: "saved locally" and "allowed to send to the model" are separate
   concerns. Each profile FIELD independently controls which PURPOSES it may be
   used for, everything is opt-in (defaults to NOT sendable), there is a true
   "never-send" field (`localOnly`), and switching the profile or the model
   DOMAIN invalidates any prior authorization.

   This module is pure: no clock reads, no randomness, no IO. It governs
   SENDING only. */

export type Purpose = 'screenshot-solve' | 'realtime-assist' | 'proactive' | 'memory-distill'

export interface FieldGrant {
  field: string
  /** When true the field is NEVER sent, regardless of any per-purpose flags.
     This is the "never-send" escape hatch — a locally-saved-only field. */
  localOnly: boolean
  /** Per-purpose allow flags. A purpose that is absent or false is NOT allowed
     (opt-in, not opt-out). */
  purposes: Partial<Record<Purpose, boolean>>
  /** A prompt hint meaning "I would rather the model not dwell on this field".
     This is deliberately NOT a send-block: "wish to avoid mentioning" is not
     the same as "won't send". Avoidance is passed to the prompt as guidance,
     while whether the value is sent at all is governed solely by `localOnly`
     and the per-purpose flags. `avoidMention` therefore never affects
     canSend(). */
  avoidMention: boolean
}

export interface ProfileAuthorization {
  profileId: string
  /** The model domain these grants were authorized against. Changing it
     invalidates the grants (see onProfileOrOriginChange). */
  modelOrigin: string
  grants: FieldGrant[]
  /** One-tap "don't use profile this session" — when true, canSend is false for
     every field/purpose until re-enabled. */
  sessionDisabled: boolean
}

/** Create an empty authorization: no grants, session enabled. */
export function createAuthorization(profileId: string, modelOrigin: string): ProfileAuthorization {
  return {
    profileId,
    modelOrigin,
    grants: [],
    sessionDisabled: false
  }
}

function normalizeGrant(field: string, grant: Partial<FieldGrant>): FieldGrant {
  const localOnly = grant.localOnly === true
  return {
    field,
    localOnly,
    // A localOnly field can never be sent, so its per-purpose flags are
    // meaningless — clear them to keep the stored state honest.
    purposes: localOnly ? {} : { ...(grant.purposes ?? {}) },
    avoidMention: grant.avoidMention === true
  }
}

/** Upsert a field grant, returning a NEW authorization (inputs never mutated).
   Passing localOnly:true clears any per-purpose flags — a localOnly field can
   never be sent. */
export function setFieldGrant(
  auth: ProfileAuthorization,
  field: string,
  grant: Partial<FieldGrant>
): ProfileAuthorization {
  const next = normalizeGrant(field, grant)
  const existingIndex = auth.grants.findIndex((g) => g.field === field)
  const grants =
    existingIndex === -1
      ? [...auth.grants, next]
      : auth.grants.map((g, i) => (i === existingIndex ? next : g))
  return { ...auth, grants }
}

/** TRUE only when the session is enabled, the field exists, it is not localOnly,
   and the specific purpose flag is true. Everything else is false (opt-in). */
export function canSend(auth: ProfileAuthorization, field: string, purpose: Purpose): boolean {
  if (auth.sessionDisabled) return false
  const grant = auth.grants.find((g) => g.field === field)
  if (!grant) return false
  if (grant.localOnly) return false
  return grant.purposes[purpose] === true
}

/** All fields that may be sent for the given purpose. */
export function fieldsForPurpose(auth: ProfileAuthorization, purpose: Purpose): string[] {
  return auth.grants.filter((g) => canSend(auth, g.field, purpose)).map((g) => g.field)
}

/** One-tap disable for the current session (returns a new authorization). */
export function disableForSession(auth: ProfileAuthorization): ProfileAuthorization {
  return { ...auth, sessionDisabled: true }
}

/** Re-enable profile use for the session (returns a new authorization). */
export function enableForSession(auth: ProfileAuthorization): ProfileAuthorization {
  return { ...auth, sessionDisabled: false }
}

/** When the profile OR the model domain changes, prior authorization is
   invalidated: return a FRESH authorization with grants cleared (and session
   re-enabled). When neither changed, return the same authorization unchanged. */
export function onProfileOrOriginChange(
  auth: ProfileAuthorization,
  next: { profileId: string; modelOrigin: string }
): ProfileAuthorization {
  if (auth.profileId === next.profileId && auth.modelOrigin === next.modelOrigin) {
    return auth
  }
  return createAuthorization(next.profileId, next.modelOrigin)
}
