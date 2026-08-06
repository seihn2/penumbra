/** Screenshot "AssetRef" lifecycle model (截图生命周期).

   Screenshots are managed by reference + hash instead of copying base64 pixels
   around the app. An AssetRef stores only a deterministic hash and metadata —
   never the raw base64 — so registries stay cheap to clone and pass over IPC.

   Every function here is pure: transitions return a brand-new registry and the
   input is left untouched. No Date.now() / Math.random(); callers pass `now`. */

export type AssetState = 'sent' | 'summarized' | 'duplicate-unsent' | 'superseded' | 'pinned'

export interface AssetRef {
  id: string
  hash: string
  state: AssetState
  createdAt: number
  pinned: boolean
}

export interface AssetRegistry {
  refs: AssetRef[]
  /** Monotonic counter backing deterministic ids (no random / time-based ids). */
  seq: number
}

/** Deterministic, non-cryptographic FNV-1a hash over the base64 string.

   Implemented inline (no node:crypto, no external deps). Identical input always
   yields the same hash; different input almost always differs. Returned as an
   unsigned base-36 string for compactness. */
export function hashImage(base64: string): string {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5
  for (let i = 0; i < base64.length; i++) {
    hash ^= base64.charCodeAt(i)
    // hash *= 16777619, kept in 32-bit range via Math.imul
    hash = Math.imul(hash, 0x01000193)
  }
  // Coerce to unsigned 32-bit before stringifying.
  return (hash >>> 0).toString(36)
}

export function createRegistry(): AssetRegistry {
  return { refs: [], seq: 0 }
}

/** A ref is "live" (can still contribute visual context) unless it has been
    superseded. Duplicates and summarized refs are still live for bookkeeping
    but are excluded from send selection below. */
function isSuperseded(ref: AssetRef): boolean {
  return ref.state === 'superseded'
}

/** Register a screenshot by its base64 pixels.

   Dedup decision: if a NON-superseded ref with the same hash already exists, we
   do NOT add a second distinct sendable image. Instead a new ref is appended in
   the 'duplicate-unsent' state (so the timeline/history still records that the
   user captured again) while the pre-existing ref remains the canonical, live
   copy the model actually sees. This keeps selectForSend free of duplicate
   pixels while preserving an audit trail of repeated captures. */
export function registerAsset(
  registry: AssetRegistry,
  input: { base64: string; now: number }
): { registry: AssetRegistry; ref: AssetRef } {
  const hash = hashImage(input.base64)
  const seq = registry.seq + 1
  const existing = registry.refs.find((ref) => ref.hash === hash && !isSuperseded(ref))

  const ref: AssetRef = {
    id: `asset-${seq}`,
    hash,
    state: existing ? 'duplicate-unsent' : 'sent',
    createdAt: input.now,
    pinned: false
  }

  return {
    registry: { refs: [...registry.refs, ref], seq },
    ref
  }
}

/** Return a new registry with the matched ref transformed by `update`. Refs are
    replaced immutably; unmatched refs (and the seq) are carried over as-is. */
function mapRef(
  registry: AssetRegistry,
  id: string,
  update: (ref: AssetRef) => AssetRef
): AssetRegistry {
  return {
    seq: registry.seq,
    refs: registry.refs.map((ref) => (ref.id === id ? update(ref) : ref))
  }
}

export function markSent(registry: AssetRegistry, id: string): AssetRegistry {
  return mapRef(registry, id, (ref) => ({ ...ref, state: 'sent' }))
}

export function markSummarized(registry: AssetRegistry, id: string): AssetRegistry {
  return mapRef(registry, id, (ref) => ({ ...ref, state: 'summarized' }))
}

export function markSuperseded(registry: AssetRegistry, id: string): AssetRegistry {
  return mapRef(registry, id, (ref) => ({ ...ref, state: 'superseded' }))
}

export function pin(registry: AssetRegistry, id: string): AssetRegistry {
  return mapRef(registry, id, (ref) => ({ ...ref, pinned: true, state: 'pinned' }))
}

/** Unpin: drop the pinned flag and fall back to 'sent' so the ref stays a live,
    sendable image (pinning only ever wraps an otherwise-live asset). */
export function unpin(registry: AssetRegistry, id: string): AssetRegistry {
  return mapRef(registry, id, (ref) => ({ ...ref, pinned: false, state: 'sent' }))
}

/** A ref is eligible for (non-pinned) send selection when it still carries live
    visual context: not superseded, not summarized, not a duplicate. */
function isSendable(ref: AssetRef): boolean {
  return ref.state === 'sent' || ref.state === 'pinned'
}

/** Choose up to `maxImages` DISTINCT images to send to the model.

   Pinned assets come first (most-recent pinned first); then the most-recent
   sendable, non-duplicate, non-superseded refs fill the remaining slots. The
   result is deduped by hash and never exceeds `maxImages`. */
export function selectForSend(registry: AssetRegistry, maxImages = 5): AssetRef[] {
  const byRecent = [...registry.refs].sort((a, b) => b.createdAt - a.createdAt)
  const pinned = byRecent.filter((ref) => ref.pinned)
  const rest = byRecent.filter((ref) => !ref.pinned && isSendable(ref))

  const selected: AssetRef[] = []
  const seenHashes = new Set<string>()

  for (const ref of [...pinned, ...rest]) {
    if (selected.length >= maxImages) break
    if (seenHashes.has(ref.hash)) continue
    seenHashes.add(ref.hash)
    selected.push(ref)
  }

  return selected
}

/** True when there is no live visual context left to send — e.g. every ref is
    superseded/summarized (or duplicate) and nothing is sendable. Callers use
    this to prompt "需要重新附图" (re-attach an image). */
export function needsReattach(registry: AssetRegistry): boolean {
  if (registry.refs.length === 0) return true
  return selectForSend(registry).length === 0
}
