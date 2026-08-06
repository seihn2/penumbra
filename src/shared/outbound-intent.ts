/** Data-egress center core (数据外发中心).

   Every external request must first register an OutboundIntent, and each egress
   produces a receipt that carries ONLY metadata — never the body/content that
   was actually sent. These functions are pure so the privacy guarantee (no
   payload ever reaches the log) is provable in isolation.

   Callers must supply `id`/`at` explicitly: this module never touches
   Date.now() or Math.random() so it stays deterministic and testable. */

export type DataCategory = 'audio' | 'screenshot' | 'transcript' | 'profile' | 'prompt' | 'other'

export interface OutboundIntent {
  id: string
  domain: string
  categories: DataCategory[]
  reason: string
  approxBytes: number
}

/** A record of a completed egress. Intentionally has NO body/content/payload
   field — only metadata derived from the intent plus the outcome. */
export interface OutboundReceipt {
  id: string
  at: number
  domain: string
  categories: DataCategory[]
  approxBytes: number
  reason: string
  outcome: 'success' | 'failure'
  error?: string
}

export interface OutboundLog {
  receipts: OutboundReceipt[]
}

/** Maximum number of receipts retained; older ones are dropped. */
export const MAX_RECEIPTS = 200

export interface CreateIntentInput {
  id: string
  domain: string
  categories: DataCategory[]
  reason?: string
  approxBytes?: number
}

/** Build a validated OutboundIntent.

   Validation policy: THROWS an Error for empty domain or empty categories.
   (We throw rather than returning an error object so a missing registration
   fails loudly at the call site — an unregistered egress is a privacy defect,
   not a recoverable condition.) */
export function createIntent(input: CreateIntentInput): OutboundIntent {
  const domain = input.domain.trim()
  if (domain.length === 0) {
    throw new Error('OutboundIntent domain must be non-empty')
  }
  if (input.categories.length === 0) {
    throw new Error('OutboundIntent categories must be non-empty')
  }
  return {
    id: input.id,
    domain,
    // Copy so the caller's array can't mutate the intent later.
    categories: dedupeCategories(input.categories),
    reason: input.reason ?? '',
    approxBytes: input.approxBytes ?? 0
  }
}

export interface RecordReceiptInput {
  outcome: 'success' | 'failure'
  at: number
  error?: string
}

/** Append a metadata-only receipt derived from `intent`, returning a NEW log.

   The input log is never mutated. The receipt copies only metadata fields from
   the intent — there is deliberately no path for a payload/body to be carried
   into the log. The log is capped to the most recent MAX_RECEIPTS entries. */
export function recordReceipt(
  log: OutboundLog,
  intent: OutboundIntent,
  input: RecordReceiptInput
): OutboundLog {
  const receipt: OutboundReceipt = {
    id: intent.id,
    at: input.at,
    domain: intent.domain,
    categories: [...intent.categories],
    approxBytes: intent.approxBytes,
    reason: intent.reason,
    outcome: input.outcome
  }
  if (input.error !== undefined) {
    receipt.error = input.error
  }
  const next = [...log.receipts, receipt]
  const capped = next.length > MAX_RECEIPTS ? next.slice(next.length - MAX_RECEIPTS) : next
  return { receipts: capped }
}

/** Compact capsule of what is currently being sent where: a map from domain to
   the deduped, sorted set of categories active for that domain. */
export function summarizeActiveEgress(intents: OutboundIntent[]): Record<string, DataCategory[]> {
  const byDomain: Record<string, DataCategory[]> = {}
  for (const intent of intents) {
    const existing = byDomain[intent.domain] ?? []
    byDomain[intent.domain] = dedupeCategories([...existing, ...intent.categories])
  }
  return byDomain
}

/** Distinct domains present in the log, in first-seen order. */
export function domainsInLog(log: OutboundLog): string[] {
  const seen = new Set<string>()
  const domains: string[] = []
  for (const receipt of log.receipts) {
    if (!seen.has(receipt.domain)) {
      seen.add(receipt.domain)
      domains.push(receipt.domain)
    }
  }
  return domains
}

/** All receipts for a given domain, preserving log order. */
export function receiptsForDomain(log: OutboundLog, domain: string): OutboundReceipt[] {
  return log.receipts.filter((receipt) => receipt.domain === domain)
}

/** Keys that must never appear on anything written to the log. */
const FORBIDDEN_BODY_KEYS = ['body', 'content', 'payload', 'data']

/** Runtime guard: throws if `obj` carries any raw-payload key. Used to assert
   that receipts remain metadata-only. */
export function assertNoBody(obj: unknown): void {
  if (obj === null || typeof obj !== 'object') return
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_BODY_KEYS.includes(key)) {
      throw new Error(`Outbound receipt must not carry a '${key}' field`)
    }
  }
}

/** Dedupe categories, preserving first-seen order. */
function dedupeCategories(categories: DataCategory[]): DataCategory[] {
  const seen = new Set<DataCategory>()
  const out: DataCategory[] = []
  for (const category of categories) {
    if (!seen.has(category)) {
      seen.add(category)
      out.push(category)
    }
  }
  return out
}
