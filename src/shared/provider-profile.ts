import type { AnswerApiProtocol } from './answer-api-protocol'

/** Provider Profile: an inseparable bundle describing one AI provider config.
   The identity of a profile is derived from a fingerprint over its
   identity-defining fields (normalized endpoint + model + headers +
   credentialRef). Secrets are never stored here — `credentialRef` is an opaque
   reference/id to a secret held elsewhere (main-process safeStorage), never the
   raw API key. All functions in this module are pure: they never mutate their
   inputs and never read ambient time/randomness (timestamps are passed in). */

/** Result of probing a provider (connection test). */
export interface ProviderTestResult {
  ok: boolean
  /** Epoch millis of when the test ran — passed in by the caller, never read here. */
  at: number
  error?: string
}

/** Optional capability flags advertised/detected for a provider. */
export interface ProviderCapabilities {
  vision?: boolean
  streaming?: boolean
  contextWindow?: number
}

/** An inseparable bundle describing one AI provider config. */
export interface ProviderProfile {
  id: string
  /** Base URL of the OpenAI-compatible endpoint. */
  endpoint: string
  /** Opaque reference/id to a secret. NEVER the raw key. */
  credentialRef: string
  model: string
  protocol?: AnswerApiProtocol
  headers?: Record<string, string>
  capabilities?: ProviderCapabilities
  /** Per-profile cached model list (isolated per provider). */
  modelCache?: string[]
  lastTest?: ProviderTestResult
  /** Stable hash of the identity-defining fields. */
  fingerprint: string
}

/** Fields whose combination defines a profile's identity. */
export interface ProviderIdentity {
  endpoint: string
  credentialRef: string
  model: string
  protocol?: AnswerApiProtocol
  headers?: Record<string, string>
}

/** Parse an endpoint into a URL, returning null when it is not a valid URL. */
function tryParseUrl(endpoint: string): URL | null {
  try {
    return new URL(endpoint.trim())
  } catch {
    return null
  }
}

/** Whether an endpoint uses the https: scheme. */
export function isHttps(endpoint: string): boolean {
  const url = tryParseUrl(endpoint)
  return url !== null && url.protocol === 'https:'
}

/** Whether an endpoint points at a local-dev loopback host. */
function isLocalhost(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return host === 'localhost' || host === '127.0.0.1'
}

/** Whether an endpoint is allowed: only https:, except plain http:// is allowed
   for localhost / 127.0.0.1 to support local development. */
export function isAllowedEndpoint(endpoint: string): boolean {
  const url = tryParseUrl(endpoint)
  if (url === null) return false
  if (url.protocol === 'https:') return true
  if (url.protocol === 'http:') return isLocalhost(url)
  return false
}

/** Canonicalize an endpoint into a stable origin+path string:
   - lowercase scheme + host
   - drop the default port for the scheme
   - strip trailing slashes on the path (an empty path stays empty)
   - drop query string and hash (they are not part of provider identity)
   Falsy/invalid endpoints are lowercased-and-trimmed as a best-effort fallback. */
export function normalizeOrigin(endpoint: string): string {
  const url = tryParseUrl(endpoint)
  if (url === null) return endpoint.trim().toLowerCase().replace(/\/+$/, '')
  const scheme = url.protocol.toLowerCase()
  const host = url.hostname.toLowerCase()
  const port = url.port ? `:${url.port}` : ''
  const path = url.pathname.replace(/\/+$/, '')
  return `${scheme}//${host}${port}${path}`
}

/** FNV-1a 32-bit non-cryptographic hash, returned as an 8-char hex string.
   Deterministic and dependency-free — suitable for stable identity fingerprints,
   NOT for security. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    // 32-bit FNV prime multiply via shifts, kept in unsigned 32-bit range.
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Serialize headers into a stable, order-independent string. */
function serializeHeaders(headers: Record<string, string> | undefined): string {
  if (!headers) return ''
  return Object.keys(headers)
    .sort()
    .map((key) => `${key.toLowerCase()}=${headers[key]}`)
    .join('&')
}

/** Compute a stable fingerprint over the identity-defining fields only.
   Same inputs -> same fingerprint. modelCache / lastTest / capabilities do NOT
   affect it. */
export function computeFingerprint(identity: ProviderIdentity): string {
  const parts = [
    normalizeOrigin(identity.endpoint),
    identity.model,
    identity.credentialRef,
    identity.protocol ?? '',
    serializeHeaders(identity.headers)
  ]
  return fnv1a(parts.join('\n'))
}

/** Return a copy of the profile with its fingerprint recomputed from its
   current identity fields. */
export function withFingerprint(profile: ProviderProfile): ProviderProfile {
  return { ...profile, fingerprint: computeFingerprint(profile) }
}

/** Whether two profiles are the same provider identity (by fingerprint). */
export function profilesEquivalent(a: ProviderProfile, b: ProviderProfile): boolean {
  return computeFingerprint(a) === computeFingerprint(b)
}

/** Whether switching from oldProfile to newProfile requires re-authorization.
   A change of normalized origin (domain/scheme/port/base-path) means the
   credential must be re-tested and re-authorized against the new host. */
export function shouldReauthorize(
  oldProfile: ProviderProfile,
  newProfile: ProviderProfile
): boolean {
  return normalizeOrigin(oldProfile.endpoint) !== normalizeOrigin(newProfile.endpoint)
}

/** Return a new profile with the test result recorded. Pure — the input is not
   mutated. A FAILED result updates only `lastTest` and preserves any existing
   `modelCache`; a successful result likewise leaves modelCache untouched (use
   setModelCache to refresh it explicitly). */
export function mergeTestResult(
  profile: ProviderProfile,
  result: ProviderTestResult
): ProviderProfile {
  return { ...profile, lastTest: { ...result } }
}

/** Return a new profile with its per-provider model cache replaced. Pure — the
   input is not mutated, and the models array is copied so later external
   mutation cannot leak in. */
export function setModelCache(profile: ProviderProfile, models: string[]): ProviderProfile {
  return { ...profile, modelCache: [...models] }
}
