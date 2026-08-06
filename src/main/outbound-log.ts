import { ipcMain } from 'electron'
import {
  createIntent,
  recordReceipt,
  summarizeActiveEgress,
  type DataCategory,
  type OutboundLog,
  type OutboundIntent
} from '../shared/outbound-intent'
import { settings } from './settings'

/** Main-process data-egress center (P0#9). Records a body-free receipt for each
   outbound request to an AI/ASR provider so the user can always answer "what
   left my machine, to which domain, why". Never stores payload content. */
let log: OutboundLog = { receipts: [] }
let receiptSeq = 0

function domainOf(url: string): string {
  try {
    return new URL(url).host || url
  } catch {
    return url || 'unknown'
  }
}

/** Record one egress. Derives the domain from the given base URL (defaults to
   the configured AI endpoint) and appends a metadata-only receipt. */
export function recordEgress(input: {
  categories: DataCategory[]
  reason: string
  approxBytes?: number
  baseURL?: string
  outcome: 'success' | 'failure'
  error?: string
  at: number
}): void {
  const domain = domainOf(input.baseURL ?? settings.apiBaseURL)
  let intent: OutboundIntent
  try {
    intent = createIntent({
      id: `eg-${++receiptSeq}`,
      domain,
      categories: input.categories,
      reason: input.reason,
      approxBytes: input.approxBytes ?? 0
    })
  } catch {
    // Invalid intent (e.g. empty categories) — never let logging break a send.
    return
  }
  log = recordReceipt(log, intent, {
    outcome: input.outcome,
    at: input.at,
    error: input.error
  })
}

export function getOutboundLog(): OutboundLog {
  return log
}

ipcMain.handle('get-outbound-log', () => log)

ipcMain.handle('get-active-egress', () => {
  // Group recent successful receipts by domain -> categories for the capsule.
  const recentIntents: OutboundIntent[] = log.receipts.slice(-20).map((r) => ({
    id: r.id,
    domain: r.domain,
    categories: r.categories,
    reason: r.reason,
    approxBytes: r.approxBytes
  }))
  return summarizeActiveEgress(recentIntents)
})
