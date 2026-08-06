/** Answer credibility & provenance ("回答可信度").

   Every claim in an AI answer has an ORIGIN. The app must never present a
   model's guess as a verbatim fact, must keep facts and inferences visually
   separate, and must be able to trace each key conclusion back to a
   screenshot / transcript / turn. When a problem constraint changes, every
   conclusion (transitively) built on it becomes invalidated.

   All functions here are pure and deterministic (no Date.now/Math.random). */

export type ProvenanceKind =
  | 'problem-text' // verbatim from the problem statement
  | 'user-constraint' // explicitly confirmed by the user
  | 'known-fact' // established, checkable fact
  | 'assumption' // reasonable assumption the model made
  | 'ai-inference' // the model's own inference
  | 'unconfirmed' // asserted but still needs confirmation

export type SourceKind = 'screenshot' | 'transcript' | 'turn'

export interface SourceRef {
  kind: SourceKind
  id: string
}

export interface Claim {
  id: string
  text: string
  provenance: ProvenanceKind
  sources: SourceRef[] // traceability: where this claim came from
  dependsOn: string[] // ids of other claims/constraints this relies on
  invalidated?: boolean
}

/** Provenance kinds ordered most -> least trustworthy. The single source of
    truth for credibility ranking; index = rank (lower = more trustworthy). */
export const CREDIBILITY_ORDER: readonly ProvenanceKind[] = [
  'problem-text',
  'user-constraint',
  'known-fact',
  'assumption',
  'ai-inference',
  'unconfirmed'
] as const

/** Kinds that assert something checkable and therefore SHOULD carry at least
    one source for traceability. Inferences/assumptions/unconfirmed claims are
    the model's own and need no external source. */
const TRACEABLE_KINDS: ReadonlySet<ProvenanceKind> = new Set<ProvenanceKind>([
  'problem-text',
  'user-constraint',
  'known-fact'
])

/** Build a claim with safe defaults: empty sources/dependsOn, not invalidated.
    Copies the incoming arrays so the returned claim never aliases the input. */
export function createClaim(
  fields: Pick<Claim, 'id' | 'text' | 'provenance'> &
    Partial<Pick<Claim, 'sources' | 'dependsOn' | 'invalidated'>>
): Claim {
  return {
    id: fields.id,
    text: fields.text,
    provenance: fields.provenance,
    sources: fields.sources ? fields.sources.map((s) => ({ ...s })) : [],
    dependsOn: fields.dependsOn ? [...fields.dependsOn] : [],
    invalidated: fields.invalidated ?? false
  }
}

/** Rank of a provenance kind (0 = most trustworthy). Ordering is strict and
    total across all six kinds. */
export function credibilityRank(kind: ProvenanceKind): number {
  return CREDIBILITY_ORDER.indexOf(kind)
}

/** Whether the claim satisfies the traceability requirement for its kind:
    fact-like kinds (problem-text/user-constraint/known-fact) need >=1 source;
    inference/assumption/unconfirmed always pass since they are the model's. */
export function isTraceable(claim: Claim): boolean {
  if (TRACEABLE_KINDS.has(claim.provenance)) {
    return claim.sources.length >= 1
  }
  return true
}

/** Whether a claim must be confirmed before it can be trusted. True for
    'unconfirmed' (self-evidently) and 'assumption' — an assumption is only a
    reasonable guess, so the user should confirm it before it hardens. */
export function requiresConfirmation(claim: Claim): boolean {
  return claim.provenance === 'unconfirmed' || claim.provenance === 'assumption'
}

/** Mark invalidated=true on every claim that (transitively) dependsOn the
    changed constraint. When B dependsOn A and A dependsOn the constraint, both
    A and B are invalidated. Pure: returns a new array of new claim objects and
    never mutates the input. */
export function invalidateByConstraintChange(
  claims: Claim[],
  changedConstraintId: string
): Claim[] {
  // ids known to be tainted, seeded with the changed constraint itself.
  const tainted = new Set<string>([changedConstraintId])

  // Fixed-point propagation: keep sweeping until no new claim gets tainted,
  // which resolves chains regardless of array order.
  let changed = true
  while (changed) {
    changed = false
    for (const claim of claims) {
      if (tainted.has(claim.id)) continue
      if (claim.dependsOn.some((dep) => tainted.has(dep))) {
        tainted.add(claim.id)
        changed = true
      }
    }
  }

  return claims.map((claim) => {
    const next = createClaim(claim)
    if (tainted.has(claim.id)) next.invalidated = true
    return next
  })
}

/** Claims still in play (not invalidated). */
export function activeClaims(claims: Claim[]): Claim[] {
  return claims.filter((claim) => !claim.invalidated)
}

/** Claims that have been invalidated by a constraint change. */
export function invalidatedClaims(claims: Claim[]): Claim[] {
  return claims.filter((claim) => claim.invalidated === true)
}

/** Bucket claims by provenance kind so facts and inferences are never
    conflated in the UI. Every kind is present as a key, empty buckets are []. */
export function separateByKind(claims: Claim[]): Record<ProvenanceKind, Claim[]> {
  const buckets = {} as Record<ProvenanceKind, Claim[]>
  for (const kind of CREDIBILITY_ORDER) {
    buckets[kind] = []
  }
  for (const claim of claims) {
    buckets[claim.provenance].push(claim)
  }
  return buckets
}

/** Whether a value is one of the known provenance kinds. */
export function isProvenanceKind(value: unknown): value is ProvenanceKind {
  return typeof value === 'string' && (CREDIBILITY_ORDER as readonly string[]).includes(value)
}

/** Parse a model's JSON provenance output into typed Claims. The model is asked
    for a JSON array of {text, provenance}; it may wrap it in markdown fences or
    add prose. This tolerantly extracts the first JSON array, keeps only entries
    with a non-empty text and a known provenance kind, and assigns deterministic
    ids (c1, c2, …). Never throws: malformed output yields an empty array, so a
    bad response simply means "no provenance breakdown" rather than a crash. */
export function parseClaims(raw: string): Claim[] {
  if (!raw) return []
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const claims: Claim[] = []
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue
    const { text, provenance } = entry as { text?: unknown; provenance?: unknown }
    if (typeof text !== 'string' || !text.trim()) continue
    if (!isProvenanceKind(provenance)) continue
    claims.push(createClaim({ id: `c${claims.length + 1}`, text: text.trim(), provenance }))
  }
  return claims
}
