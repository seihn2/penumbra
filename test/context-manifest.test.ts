import { describe, expect, it } from 'vitest'
import {
  compileContext,
  estimateTokens,
  summarizeManifestForUser,
  MIN_OUTPUT_RESERVATION,
  type CompileContextInput,
  type ContextItem
} from '../src/shared/context-manifest'

function item(overrides: Partial<ContextItem> = {}): ContextItem {
  return {
    turnId: overrides.turnId ?? 't1',
    text: overrides.text ?? 'some text',
    kind: overrides.kind ?? 'fact',
    estimatedTokens: overrides.estimatedTokens ?? 10
  }
}

function makeInput(overrides: Partial<CompileContextInput> = {}): CompileContextInput {
  return {
    currentQuestion: overrides.currentQuestion ?? 'How do I reverse a linked list?',
    items: overrides.items ?? [],
    constraints: overrides.constraints ?? [],
    summary: overrides.summary ?? '',
    screenshots: overrides.screenshots ?? [],
    profileFields: overrides.profileFields ?? [],
    budget: overrides.budget ?? { modelContextWindow: 100000 }
  }
}

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('charges ASCII text at ~1/4 char per token', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcde')).toBe(2)
  })

  it('charges CJK characters roughly one token each', () => {
    expect(estimateTokens('你好世界')).toBe(4)
  })

  it('handles mixed CJK and ASCII text', () => {
    // 2 CJK (你好) + ceil(4/4)=1 for 'code' => 3
    expect(estimateTokens('你好code')).toBe(3)
  })

  it('is deterministic across repeated calls', () => {
    const s = '深入理解 TypeScript generics and constraints 泛型约束'
    const first = estimateTokens(s)
    for (let i = 0; i < 5; i++) {
      expect(estimateTokens(s)).toBe(first)
    }
  })
})

describe('compileContext budget math', () => {
  it('reserves max(2048, 20%) for output and 80% for input on a large window', () => {
    const manifest = compileContext(makeInput({ budget: { modelContextWindow: 100000 } }))
    expect(manifest.outputReservation).toBe(20000)
    expect(manifest.inputTokenBudget).toBe(80000)
  })

  it('floors output reservation at 2048 for small windows', () => {
    const manifest = compileContext(makeInput({ budget: { modelContextWindow: 4000 } }))
    // 20% of 4000 = 800, floored up to the 2048 minimum
    expect(manifest.outputReservation).toBe(MIN_OUTPUT_RESERVATION)
    expect(manifest.inputTokenBudget).toBe(3200)
  })

  it('uses floor for both reservation and input budget', () => {
    const manifest = compileContext(makeInput({ budget: { modelContextWindow: 12345 } }))
    expect(manifest.outputReservation).toBe(Math.floor(12345 * 0.2))
    expect(manifest.inputTokenBudget).toBe(Math.floor(12345 * 0.8))
  })
})

describe('compileContext inclusion rules', () => {
  it('always includes the current question and user constraints under a tiny budget', () => {
    const input = makeInput({
      currentQuestion: 'What is the time complexity?',
      constraints: ['Must run in O(n)', 'No external libraries'],
      items: [
        item({
          turnId: 'c1',
          kind: 'user-constraint',
          text: 'Use TypeScript',
          estimatedTokens: 5000
        }),
        item({ turnId: 'f1', kind: 'fact', text: 'big fact', estimatedTokens: 5000 })
      ],
      budget: { modelContextWindow: 10 } // input budget floor(10*0.8) = 8, tiny
    })
    const manifest = compileContext(input)
    expect(manifest.currentQuestion).toBe('What is the time complexity?')
    expect(manifest.hardConstraints).toEqual(['Must run in O(n)', 'No external libraries'])
    // The user-constraint item is never dropped even though it far exceeds budget.
    const keptIds = manifest.historyExcerpts.map((h) => h.turnId)
    expect(keptIds).toContain('c1')
    expect(manifest.excluded.find((e) => e.turnId === 'c1')).toBeUndefined()
  })

  it('excludes lower-priority items first with reason budget when over budget', () => {
    const input = makeInput({
      items: [
        item({ turnId: 'f1', kind: 'fact', text: 'fact one', estimatedTokens: 30 }),
        item({ turnId: 'i1', kind: 'ai-inference', text: 'inference one', estimatedTokens: 30 }),
        item({ turnId: 'u1', kind: 'unconfirmed', text: 'unconfirmed one', estimatedTokens: 30 })
      ],
      // input budget floor(50*0.8)=40; question is short, so ~ room for one 30-token item
      budget: { modelContextWindow: 50 }
    })
    const manifest = compileContext(input)
    const keptIds = manifest.historyExcerpts.map((h) => h.turnId)
    // The fact (highest of the three) is kept; the inference/unconfirmed drop first.
    expect(keptIds).toContain('f1')
    expect(manifest.excluded.map((e) => e.turnId)).toEqual(expect.arrayContaining(['i1', 'u1']))
    for (const e of manifest.excluded) {
      expect(e.reason).toBe('budget')
    }
  })

  it('drops unconfirmed before ai-inference before facts', () => {
    const input = makeInput({
      items: [
        item({ turnId: 'u1', kind: 'unconfirmed', estimatedTokens: 500 }),
        item({ turnId: 'i1', kind: 'ai-inference', estimatedTokens: 500 }),
        item({ turnId: 'f1', kind: 'fact', estimatedTokens: 500 })
      ],
      // room for exactly one 500-token item
      budget: { modelContextWindow: 700 } // input budget floor(700*0.8)=560
    })
    const manifest = compileContext(input)
    const keptIds = manifest.historyExcerpts.map((h) => h.turnId)
    expect(keptIds).toEqual(['f1'])
    expect(manifest.excluded.map((e) => e.turnId).sort()).toEqual(['i1', 'u1'])
  })

  it('includes everything when the budget is generous', () => {
    const input = makeInput({
      items: [
        item({ turnId: 'f1', kind: 'fact', estimatedTokens: 10 }),
        item({ turnId: 'i1', kind: 'ai-inference', estimatedTokens: 10 }),
        item({ turnId: 'u1', kind: 'unconfirmed', estimatedTokens: 10 })
      ],
      budget: { modelContextWindow: 100000 }
    })
    const manifest = compileContext(input)
    expect(manifest.historyExcerpts.map((h) => h.turnId).sort()).toEqual(['f1', 'i1', 'u1'])
    expect(manifest.excluded).toEqual([])
  })

  it('never promotes an ai-inference into hardConstraints', () => {
    const input = makeInput({
      constraints: ['Only user constraint'],
      items: [item({ turnId: 'i1', kind: 'ai-inference', text: 'The user probably wants Python' })],
      budget: { modelContextWindow: 100000 }
    })
    const manifest = compileContext(input)
    expect(manifest.hardConstraints).toEqual(['Only user constraint'])
    expect(manifest.hardConstraints).not.toContain('The user probably wants Python')
  })

  it('keeps information kinds separate: inference stays only in excerpts', () => {
    const input = makeInput({
      items: [item({ turnId: 'i1', kind: 'ai-inference', text: 'guessed detail' })],
      budget: { modelContextWindow: 100000 }
    })
    const manifest = compileContext(input)
    // present as an excerpt, absent from hardConstraints
    expect(manifest.historyExcerpts.find((h) => h.turnId === 'i1')).toBeDefined()
    expect(manifest.hardConstraints).toEqual([])
  })

  it('passes through screenshots, summary and profile fields', () => {
    const input = makeInput({
      summary: 'Discussing graph traversal',
      screenshots: ['shot-1', 'shot-2'],
      profileFields: [{ key: 'role', value: 'backend engineer' }],
      budget: { modelContextWindow: 100000 }
    })
    const manifest = compileContext(input)
    expect(manifest.topicSummary).toBe('Discussing graph traversal')
    expect(manifest.screenshots).toEqual(['shot-1', 'shot-2'])
    expect(manifest.profileFields).toEqual([{ key: 'role', value: 'backend engineer' }])
  })

  it('preserves original order for equal-priority items', () => {
    const input = makeInput({
      items: [
        item({ turnId: 'f2', kind: 'fact', estimatedTokens: 5 }),
        item({ turnId: 'f1', kind: 'fact', estimatedTokens: 5 }),
        item({ turnId: 'f3', kind: 'fact', estimatedTokens: 5 })
      ],
      budget: { modelContextWindow: 100000 }
    })
    const manifest = compileContext(input)
    expect(manifest.historyExcerpts.map((h) => h.turnId)).toEqual(['f2', 'f1', 'f3'])
  })
})

describe('compileContext purity', () => {
  it('does not mutate the input arrays or objects', () => {
    const items = [
      item({ turnId: 'f1', kind: 'fact' }),
      item({ turnId: 'i1', kind: 'ai-inference' })
    ]
    const constraints = ['c1']
    const screenshots = ['s1']
    const profileFields = [{ key: 'k', value: 'v' }]
    const input = makeInput({ items, constraints, screenshots, profileFields })

    const itemsSnapshot = JSON.parse(JSON.stringify(items))
    const constraintsSnapshot = [...constraints]
    const screenshotsSnapshot = [...screenshots]
    const profileSnapshot = JSON.parse(JSON.stringify(profileFields))

    const manifest = compileContext(input)

    expect(items).toEqual(itemsSnapshot)
    expect(constraints).toEqual(constraintsSnapshot)
    expect(screenshots).toEqual(screenshotsSnapshot)
    expect(profileFields).toEqual(profileSnapshot)

    // Returned collections are fresh copies, not the same references.
    expect(manifest.screenshots).not.toBe(screenshots)
    expect(manifest.hardConstraints).not.toBe(constraints)
    expect(manifest.profileFields).not.toBe(profileFields)
  })

  it('is deterministic: same input yields identical manifests', () => {
    const build = (): CompileContextInput =>
      makeInput({
        items: [
          item({ turnId: 'f1', kind: 'fact', estimatedTokens: 30 }),
          item({ turnId: 'u1', kind: 'unconfirmed', estimatedTokens: 30 })
        ],
        budget: { modelContextWindow: 60 }
      })
    const a = compileContext(build())
    const b = compileContext(build())
    expect(a).toEqual(b)
  })
})

describe('summarizeManifestForUser', () => {
  it('lists what the AI remembers this time', () => {
    const manifest = compileContext(
      makeInput({
        currentQuestion: 'Explain quicksort',
        constraints: ['O(n log n) average'],
        summary: 'Sorting algorithms',
        screenshots: ['s1'],
        profileFields: [{ key: 'lang', value: 'go' }],
        items: [item({ turnId: 'f1', kind: 'fact' })],
        budget: { modelContextWindow: 100000 }
      })
    )
    const text = summarizeManifestForUser(manifest)
    expect(text).toContain('Explain quicksort')
    expect(text).toContain('硬性约束：1 条')
    expect(text).toContain('截图：1 张')
    expect(text).toContain('输入预算：80000 tokens')
    expect(text).toContain('输出预留：20000 tokens')
  })
})

describe('no non-deterministic sources', () => {
  it('module source contains no Date.now or Math.random', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../src/shared/context-manifest.ts', import.meta.url), 'utf8')
    expect(src).not.toContain('Date.now')
    expect(src).not.toContain('Math.random')
  })
})
