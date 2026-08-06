import { describe, expect, it } from 'vitest'
import {
  allowTask,
  canRunFrequency,
  createUsage,
  degradePlan,
  isOverBudget,
  minIntervalFor,
  recordUsage,
  type BudgetLimits,
  type BudgetUsage
} from '../src/shared/cost-budget'

const basePriority: BudgetLimits['priority'] = [
  'solve',
  'assist',
  'translation',
  'summary',
  'proactive'
]

const limits = (over: Partial<BudgetLimits> = {}): BudgetLimits => ({
  priority: basePriority,
  ...over
})

describe('createUsage', () => {
  it('starts at zero with empty lastAt', () => {
    expect(createUsage()).toEqual({ requests: 0, tokens: 0, costUsd: 0, lastAt: {} })
  })
})

describe('recordUsage', () => {
  it('is a pure increment and never mutates its input', () => {
    const usage = createUsage()
    const next = recordUsage(usage, { requests: 1, tokens: 200, costUsd: 0.01 })
    expect(next).toEqual({ requests: 1, tokens: 200, costUsd: 0.01, lastAt: {} })
    // original untouched
    expect(usage).toEqual({ requests: 0, tokens: 0, costUsd: 0, lastAt: {} })
    expect(next).not.toBe(usage)
    expect(next.lastAt).not.toBe(usage.lastAt)
  })

  it('accumulates across multiple records', () => {
    let usage = createUsage()
    usage = recordUsage(usage, { requests: 1, tokens: 100 })
    usage = recordUsage(usage, { requests: 1, tokens: 50, costUsd: 0.5 })
    expect(usage).toEqual({ requests: 2, tokens: 150, costUsd: 0.5, lastAt: {} })
  })

  it('sets lastAt[task] only when both task and now are given', () => {
    const usage = createUsage()
    const withTime = recordUsage(usage, { task: 'translation', now: 1000 })
    expect(withTime.lastAt).toEqual({ translation: 1000 })
    // task without now does not set lastAt
    const noNow = recordUsage(usage, { task: 'summary' })
    expect(noNow.lastAt).toEqual({})
    // now without task does not set lastAt
    const noTask = recordUsage(usage, { now: 500 })
    expect(noTask.lastAt).toEqual({})
  })

  it('treats missing deltas as zero', () => {
    const usage = { requests: 3, tokens: 30, costUsd: 0.3, lastAt: { assist: 5 } }
    expect(recordUsage(usage, {})).toEqual(usage)
  })
})

describe('isOverBudget', () => {
  it('never flags a dimension whose max is undefined', () => {
    const usage: BudgetUsage = { requests: 999, tokens: 1e9, costUsd: 1e6, lastAt: {} }
    expect(isOverBudget(usage, limits())).toEqual({
      requests: false,
      tokens: false,
      cost: false,
      any: false
    })
  })

  it('flags requests only when the request max is reached', () => {
    const l = limits({ maxRequests: 3 })
    expect(isOverBudget({ requests: 2, tokens: 0, costUsd: 0, lastAt: {} }, l).requests).toBe(false)
    expect(isOverBudget({ requests: 3, tokens: 0, costUsd: 0, lastAt: {} }, l).requests).toBe(true)
    expect(isOverBudget({ requests: 4, tokens: 0, costUsd: 0, lastAt: {} }, l).requests).toBe(true)
  })

  it('flags tokens only when the token max is reached', () => {
    const l = limits({ maxTokens: 1000 })
    expect(isOverBudget({ requests: 0, tokens: 999, costUsd: 0, lastAt: {} }, l).tokens).toBe(false)
    expect(isOverBudget({ requests: 0, tokens: 1000, costUsd: 0, lastAt: {} }, l).tokens).toBe(true)
  })

  it('flags cost only when the cost max is reached', () => {
    const l = limits({ maxCostUsd: 0.5 })
    expect(isOverBudget({ requests: 0, tokens: 0, costUsd: 0.49, lastAt: {} }, l).cost).toBe(false)
    expect(isOverBudget({ requests: 0, tokens: 0, costUsd: 0.5, lastAt: {} }, l).cost).toBe(true)
  })

  it('aggregates any across all dimensions', () => {
    const l = limits({ maxRequests: 5, maxTokens: 100, maxCostUsd: 1 })
    expect(isOverBudget({ requests: 1, tokens: 10, costUsd: 0.1, lastAt: {} }, l).any).toBe(false)
    // only tokens over -> any is true
    expect(isOverBudget({ requests: 1, tokens: 200, costUsd: 0.1, lastAt: {} }, l).any).toBe(true)
  })
})

describe('minIntervalFor', () => {
  it('returns the per-task interval for throttled tasks', () => {
    const l = limits({
      minTranslationIntervalMs: 3000,
      minSummaryIntervalMs: 10000,
      minProactiveIntervalMs: 20000
    })
    expect(minIntervalFor('translation', l)).toBe(3000)
    expect(minIntervalFor('summary', l)).toBe(10000)
    expect(minIntervalFor('proactive', l)).toBe(20000)
  })

  it('returns undefined for non-throttled tasks and unset intervals', () => {
    expect(minIntervalFor('solve', limits({ minTranslationIntervalMs: 3000 }))).toBeUndefined()
    expect(minIntervalFor('assist', limits({ minTranslationIntervalMs: 3000 }))).toBeUndefined()
    expect(minIntervalFor('translation', limits())).toBeUndefined()
  })
})

describe('canRunFrequency', () => {
  it('always passes tasks with no configured interval', () => {
    const usage = recordUsage(createUsage(), { task: 'assist', now: 1000 })
    expect(canRunFrequency(usage, 'assist', limits(), 1001)).toBe(true)
    expect(canRunFrequency(usage, 'solve', limits(), 1001)).toBe(true)
  })

  it('passes when the task has never run', () => {
    const l = limits({ minTranslationIntervalMs: 3000 })
    expect(canRunFrequency(createUsage(), 'translation', l, 0)).toBe(true)
  })

  it('throttles until the interval elapses, then passes', () => {
    const l = limits({ minSummaryIntervalMs: 5000 })
    const usage = recordUsage(createUsage(), { task: 'summary', now: 1000 })
    expect(canRunFrequency(usage, 'summary', l, 4999)).toBe(false)
    expect(canRunFrequency(usage, 'summary', l, 6000)).toBe(true)
    // exactly at the boundary counts as elapsed
    expect(canRunFrequency(usage, 'summary', l, 6000)).toBe(true)
    expect(canRunFrequency(usage, 'summary', l, 6000 - 1001)).toBe(false)
  })

  it('throttles proactive by its own interval', () => {
    const l = limits({ minProactiveIntervalMs: 20000 })
    const usage = recordUsage(createUsage(), { task: 'proactive', now: 100 })
    expect(canRunFrequency(usage, 'proactive', l, 100 + 19999)).toBe(false)
    expect(canRunFrequency(usage, 'proactive', l, 100 + 20000)).toBe(true)
  })
})

describe('allowTask', () => {
  it('always allows solve, even when over budget', () => {
    const l = limits({ maxRequests: 1, maxTokens: 1, maxCostUsd: 0.01 })
    const usage: BudgetUsage = { requests: 99, tokens: 99, costUsd: 99, lastAt: {} }
    expect(allowTask(usage, 'solve', l, 0)).toEqual({ allow: true })
  })

  it('blocks non-core tasks with over-budget when any dimension is exhausted', () => {
    const l = limits({ maxRequests: 3 })
    const usage: BudgetUsage = { requests: 3, tokens: 0, costUsd: 0, lastAt: {} }
    expect(allowTask(usage, 'assist', l, 0)).toEqual({ allow: false, reason: 'over-budget' })
    expect(allowTask(usage, 'translation', l, 0)).toEqual({
      allow: false,
      reason: 'over-budget'
    })
  })

  it('allows non-core tasks when under budget and not throttled', () => {
    const l = limits({ maxRequests: 10, minTranslationIntervalMs: 3000 })
    const usage: BudgetUsage = { requests: 1, tokens: 0, costUsd: 0, lastAt: {} }
    expect(allowTask(usage, 'assist', l, 0)).toEqual({ allow: true })
    expect(allowTask(usage, 'translation', l, 0)).toEqual({ allow: true })
  })

  it('returns too-frequent within the interval, then allows after it elapses', () => {
    const l = limits({ maxRequests: 100, minTranslationIntervalMs: 3000 })
    const usage = recordUsage(createUsage(), { requests: 1, task: 'translation', now: 1000 })
    expect(allowTask(usage, 'translation', l, 2000)).toEqual({
      allow: false,
      reason: 'too-frequent'
    })
    expect(allowTask(usage, 'translation', l, 4000)).toEqual({ allow: true })
  })

  it('prefers over-budget over too-frequent when both apply', () => {
    const l = limits({ maxRequests: 1, minTranslationIntervalMs: 3000 })
    const usage = recordUsage(createUsage(), { requests: 5, task: 'translation', now: 1000 })
    expect(allowTask(usage, 'translation', l, 1500)).toEqual({
      allow: false,
      reason: 'over-budget'
    })
  })
})

describe('degradePlan', () => {
  it('is the reverse of priority and never includes solve', () => {
    expect(degradePlan(limits())).toEqual(['proactive', 'summary', 'translation', 'assist'])
  })

  it('excludes solve regardless of its position in priority', () => {
    const l = limits({ priority: ['proactive', 'solve', 'assist'] })
    expect(degradePlan(l)).toEqual(['assist', 'proactive'])
  })

  it('does not mutate the priority array', () => {
    const l = limits()
    const before = [...l.priority]
    degradePlan(l)
    expect(l.priority).toEqual(before)
  })
})

describe('no non-deterministic time/random sources', () => {
  it('source contains no Date.now or Math.random', async () => {
    const fs = await import('node:fs')
    const url = await import('node:url')
    const path = new url.URL('../src/shared/cost-budget.ts', import.meta.url)
    const src = fs.readFileSync(path, 'utf8')
    expect(src).not.toMatch(/Date\.now/)
    expect(src).not.toMatch(/Math\.random/)
  })
})
