import { describe, expect, it } from 'vitest'
import {
  assertNoBody,
  createIntent,
  domainsInLog,
  MAX_RECEIPTS,
  recordReceipt,
  receiptsForDomain,
  summarizeActiveEgress,
  type DataCategory,
  type OutboundIntent,
  type OutboundLog
} from '../src/shared/outbound-intent'

const emptyLog: OutboundLog = { receipts: [] }

function intent(overrides: Partial<OutboundIntent> = {}): OutboundIntent {
  return createIntent({
    id: overrides.id ?? 'i1',
    domain: overrides.domain ?? 'dashscope.com',
    categories: overrides.categories ?? ['audio'],
    reason: overrides.reason ?? 'stream audio',
    approxBytes: overrides.approxBytes ?? 1024
  })
}

const FORBIDDEN = ['body', 'content', 'payload', 'data']

describe('createIntent', () => {
  it('builds a validated intent', () => {
    const result = createIntent({
      id: 'i1',
      domain: 'api.example.com',
      categories: ['screenshot'],
      reason: 'solve problem',
      approxBytes: 4096
    })
    expect(result).toEqual({
      id: 'i1',
      domain: 'api.example.com',
      categories: ['screenshot'],
      reason: 'solve problem',
      approxBytes: 4096
    })
  })

  it('defaults reason and approxBytes when omitted', () => {
    const result = createIntent({ id: 'i1', domain: 'x.com', categories: ['other'] })
    expect(result.reason).toBe('')
    expect(result.approxBytes).toBe(0)
  })

  it('trims and rejects empty domain', () => {
    expect(() => createIntent({ id: 'i1', domain: '', categories: ['audio'] })).toThrow()
    expect(() => createIntent({ id: 'i1', domain: '   ', categories: ['audio'] })).toThrow()
  })

  it('rejects empty categories', () => {
    expect(() => createIntent({ id: 'i1', domain: 'x.com', categories: [] })).toThrow()
  })

  it('dedupes categories in the intent', () => {
    const result = createIntent({
      id: 'i1',
      domain: 'x.com',
      categories: ['audio', 'audio', 'transcript']
    })
    expect(result.categories).toEqual(['audio', 'transcript'])
  })

  it('does not mutate the caller categories array', () => {
    const cats: DataCategory[] = ['audio', 'audio']
    createIntent({ id: 'i1', domain: 'x.com', categories: cats })
    expect(cats).toEqual(['audio', 'audio'])
  })
})

describe('recordReceipt', () => {
  it('appends a receipt derived from the intent', () => {
    const log = recordReceipt(emptyLog, intent(), { outcome: 'success', at: 100 })
    expect(log.receipts).toHaveLength(1)
    expect(log.receipts[0]).toEqual({
      id: 'i1',
      at: 100,
      domain: 'dashscope.com',
      categories: ['audio'],
      approxBytes: 1024,
      reason: 'stream audio',
      outcome: 'success'
    })
  })

  it('carries the error only on failure', () => {
    const log = recordReceipt(emptyLog, intent(), {
      outcome: 'failure',
      at: 200,
      error: 'timeout'
    })
    expect(log.receipts[0].outcome).toBe('failure')
    expect(log.receipts[0].error).toBe('timeout')
  })

  it('produces metadata-only receipts (no body/content/payload/data keys)', () => {
    const log = recordReceipt(emptyLog, intent(), { outcome: 'success', at: 100 })
    const receipt = log.receipts[0]
    for (const key of FORBIDDEN) {
      expect(Object.prototype.hasOwnProperty.call(receipt, key)).toBe(false)
    }
    expect(() => assertNoBody(receipt)).not.toThrow()
  })

  it('does not mutate the input log', () => {
    const log: OutboundLog = { receipts: [] }
    recordReceipt(log, intent(), { outcome: 'success', at: 1 })
    expect(log.receipts).toHaveLength(0)
  })

  it('does not share the categories array with the intent', () => {
    const source = intent()
    const log = recordReceipt(emptyLog, source, { outcome: 'success', at: 1 })
    expect(log.receipts[0].categories).not.toBe(source.categories)
  })

  it('caps the log at 200, keeping the newest', () => {
    let log: OutboundLog = { receipts: [] }
    for (let n = 0; n < 205; n++) {
      log = recordReceipt(log, intent({ id: `i${n}` }), { outcome: 'success', at: n })
    }
    expect(log.receipts).toHaveLength(MAX_RECEIPTS)
    expect(log.receipts[0].id).toBe('i5')
    expect(log.receipts[MAX_RECEIPTS - 1].id).toBe('i204')
  })
})

describe('summarizeActiveEgress', () => {
  it('groups categories by domain', () => {
    const result = summarizeActiveEgress([
      intent({ id: 'a', domain: 'dashscope.com', categories: ['audio'] }),
      intent({
        id: 'b',
        domain: 'api.example.com',
        categories: ['screenshot', 'transcript', 'profile']
      })
    ])
    expect(result).toEqual({
      'dashscope.com': ['audio'],
      'api.example.com': ['screenshot', 'transcript', 'profile']
    })
  })

  it('merges and dedupes categories across intents to the same domain', () => {
    const result = summarizeActiveEgress([
      intent({ id: 'a', domain: 'api.example.com', categories: ['screenshot'] }),
      intent({ id: 'b', domain: 'api.example.com', categories: ['screenshot', 'prompt'] })
    ])
    expect(result).toEqual({ 'api.example.com': ['screenshot', 'prompt'] })
  })

  it('returns an empty map for no intents', () => {
    expect(summarizeActiveEgress([])).toEqual({})
  })
})

describe('domainsInLog / receiptsForDomain', () => {
  it('lists distinct domains in first-seen order', () => {
    let log: OutboundLog = { receipts: [] }
    log = recordReceipt(log, intent({ id: '1', domain: 'a.com' }), { outcome: 'success', at: 1 })
    log = recordReceipt(log, intent({ id: '2', domain: 'b.com' }), { outcome: 'success', at: 2 })
    log = recordReceipt(log, intent({ id: '3', domain: 'a.com' }), { outcome: 'success', at: 3 })
    expect(domainsInLog(log)).toEqual(['a.com', 'b.com'])
  })

  it('filters receipts by domain preserving order', () => {
    let log: OutboundLog = { receipts: [] }
    log = recordReceipt(log, intent({ id: '1', domain: 'a.com' }), { outcome: 'success', at: 1 })
    log = recordReceipt(log, intent({ id: '2', domain: 'b.com' }), { outcome: 'success', at: 2 })
    log = recordReceipt(log, intent({ id: '3', domain: 'a.com' }), { outcome: 'failure', at: 3 })
    const forA = receiptsForDomain(log, 'a.com')
    expect(forA.map((r) => r.id)).toEqual(['1', '3'])
  })
})

describe('assertNoBody', () => {
  it('throws when a forbidden payload key is present', () => {
    for (const key of FORBIDDEN) {
      expect(() => assertNoBody({ [key]: 'secret' })).toThrow()
    }
  })

  it('does not throw for metadata-only objects, null, or non-objects', () => {
    expect(() => assertNoBody({ domain: 'x.com', approxBytes: 1 })).not.toThrow()
    expect(() => assertNoBody(null)).not.toThrow()
    expect(() => assertNoBody('string')).not.toThrow()
  })
})
