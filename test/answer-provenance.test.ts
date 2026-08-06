import { describe, expect, it } from 'vitest'
import {
  CREDIBILITY_ORDER,
  Claim,
  ProvenanceKind,
  activeClaims,
  createClaim,
  credibilityRank,
  invalidateByConstraintChange,
  invalidatedClaims,
  isTraceable,
  requiresConfirmation,
  separateByKind,
  isProvenanceKind,
  parseClaims
} from '../src/shared/answer-provenance'

const source = (kind: 'screenshot' | 'transcript' | 'turn', id: string) => ({ kind, id })

describe('createClaim', () => {
  it('applies safe defaults for optional fields', () => {
    const claim = createClaim({ id: 'c1', text: 'n is positive', provenance: 'assumption' })
    expect(claim.sources).toEqual([])
    expect(claim.dependsOn).toEqual([])
    expect(claim.invalidated).toBe(false)
  })

  it('preserves provided fields', () => {
    const claim = createClaim({
      id: 'c2',
      text: 'array is sorted',
      provenance: 'problem-text',
      sources: [source('screenshot', 's1')],
      dependsOn: ['c1'],
      invalidated: true
    })
    expect(claim.sources).toEqual([source('screenshot', 's1')])
    expect(claim.dependsOn).toEqual(['c1'])
    expect(claim.invalidated).toBe(true)
  })

  it('copies arrays so the claim does not alias the input', () => {
    const sources = [source('turn', 't1')]
    const dependsOn = ['c0']
    const claim = createClaim({
      id: 'c3',
      text: 'x',
      provenance: 'known-fact',
      sources,
      dependsOn
    })
    sources.push(source('turn', 't2'))
    dependsOn.push('c99')
    expect(claim.sources).toEqual([source('turn', 't1')])
    expect(claim.dependsOn).toEqual(['c0'])
  })
})

describe('credibilityRank', () => {
  it('orders problem-text most trustworthy down to unconfirmed', () => {
    expect(credibilityRank('problem-text')).toBe(0)
    expect(credibilityRank('user-constraint')).toBe(1)
    expect(credibilityRank('known-fact')).toBe(2)
    expect(credibilityRank('assumption')).toBe(3)
    expect(credibilityRank('ai-inference')).toBe(4)
    expect(credibilityRank('unconfirmed')).toBe(5)
  })

  it('is strict and total across all six kinds', () => {
    const ranks = CREDIBILITY_ORDER.map(credibilityRank)
    expect(new Set(ranks).size).toBe(6)
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1])
    }
  })
})

describe('isTraceable', () => {
  it('requires a source for problem-text', () => {
    const kinds: ProvenanceKind[] = ['problem-text', 'user-constraint', 'known-fact']
    for (const kind of kinds) {
      expect(isTraceable(createClaim({ id: kind, text: 't', provenance: kind }))).toBe(false)
      expect(
        isTraceable(
          createClaim({
            id: kind,
            text: 't',
            provenance: kind,
            sources: [source('screenshot', 's')]
          })
        )
      ).toBe(true)
    }
  })

  it('does not require a source for inference/assumption/unconfirmed', () => {
    const kinds: ProvenanceKind[] = ['assumption', 'ai-inference', 'unconfirmed']
    for (const kind of kinds) {
      expect(isTraceable(createClaim({ id: kind, text: 't', provenance: kind }))).toBe(true)
    }
  })
})

describe('requiresConfirmation', () => {
  it('is true for unconfirmed', () => {
    expect(
      requiresConfirmation(createClaim({ id: 'u', text: 't', provenance: 'unconfirmed' }))
    ).toBe(true)
  })

  it('is true for assumption (a reasonable guess still needs confirming)', () => {
    expect(
      requiresConfirmation(createClaim({ id: 'a', text: 't', provenance: 'assumption' }))
    ).toBe(true)
  })

  it('is false for facts and inferences', () => {
    const kinds: ProvenanceKind[] = [
      'problem-text',
      'user-constraint',
      'known-fact',
      'ai-inference'
    ]
    for (const kind of kinds) {
      expect(requiresConfirmation(createClaim({ id: kind, text: 't', provenance: kind }))).toBe(
        false
      )
    }
  })
})

describe('invalidateByConstraintChange', () => {
  it('marks a claim that directly depends on the changed constraint', () => {
    const claims: Claim[] = [
      createClaim({
        id: 'a',
        text: 'uses constraint',
        provenance: 'ai-inference',
        dependsOn: ['k1']
      })
    ]
    const result = invalidateByConstraintChange(claims, 'k1')
    expect(result[0].invalidated).toBe(true)
  })

  it('marks transitive dependents (B -> A -> constraint)', () => {
    const claims: Claim[] = [
      createClaim({ id: 'A', text: 'a', provenance: 'ai-inference', dependsOn: ['k1'] }),
      createClaim({ id: 'B', text: 'b', provenance: 'ai-inference', dependsOn: ['A'] })
    ]
    const result = invalidateByConstraintChange(claims, 'k1')
    expect(result.find((c) => c.id === 'A')?.invalidated).toBe(true)
    expect(result.find((c) => c.id === 'B')?.invalidated).toBe(true)
  })

  it('resolves chains regardless of array order', () => {
    const claims: Claim[] = [
      createClaim({ id: 'B', text: 'b', provenance: 'ai-inference', dependsOn: ['A'] }),
      createClaim({ id: 'A', text: 'a', provenance: 'ai-inference', dependsOn: ['k1'] })
    ]
    const result = invalidateByConstraintChange(claims, 'k1')
    expect(result.find((c) => c.id === 'A')?.invalidated).toBe(true)
    expect(result.find((c) => c.id === 'B')?.invalidated).toBe(true)
  })

  it('leaves unrelated claims active', () => {
    const claims: Claim[] = [
      createClaim({ id: 'A', text: 'a', provenance: 'ai-inference', dependsOn: ['k1'] }),
      createClaim({ id: 'C', text: 'c', provenance: 'known-fact', dependsOn: ['k2'] })
    ]
    const result = invalidateByConstraintChange(claims, 'k1')
    expect(result.find((c) => c.id === 'A')?.invalidated).toBe(true)
    expect(result.find((c) => c.id === 'C')?.invalidated).toBe(false)
  })

  it('does not mutate the input array or its claims', () => {
    const claims: Claim[] = [
      createClaim({ id: 'A', text: 'a', provenance: 'ai-inference', dependsOn: ['k1'] })
    ]
    const before = structuredClone(claims)
    invalidateByConstraintChange(claims, 'k1')
    expect(claims).toEqual(before)
  })
})

describe('activeClaims / invalidatedClaims', () => {
  it('splits claims by invalidated flag', () => {
    const claims: Claim[] = [
      createClaim({ id: 'A', text: 'a', provenance: 'ai-inference', dependsOn: ['k1'] }),
      createClaim({ id: 'B', text: 'b', provenance: 'known-fact' })
    ]
    const result = invalidateByConstraintChange(claims, 'k1')
    expect(activeClaims(result).map((c) => c.id)).toEqual(['B'])
    expect(invalidatedClaims(result).map((c) => c.id)).toEqual(['A'])
  })
})

describe('separateByKind', () => {
  it('has all six keys present with empty buckets as []', () => {
    const buckets = separateByKind([])
    for (const kind of CREDIBILITY_ORDER) {
      expect(buckets[kind]).toEqual([])
    }
    expect(Object.keys(buckets).sort()).toEqual([...CREDIBILITY_ORDER].sort())
  })

  it('buckets each claim into its provenance kind', () => {
    const claims: Claim[] = [
      createClaim({ id: 'p', text: 'p', provenance: 'problem-text' }),
      createClaim({ id: 'i1', text: 'i', provenance: 'ai-inference' }),
      createClaim({ id: 'i2', text: 'i', provenance: 'ai-inference' })
    ]
    const buckets = separateByKind(claims)
    expect(buckets['problem-text'].map((c) => c.id)).toEqual(['p'])
    expect(buckets['ai-inference'].map((c) => c.id)).toEqual(['i1', 'i2'])
    expect(buckets['assumption']).toEqual([])
  })
})

describe('purity / determinism', () => {
  it('createClaim does not mutate the input arrays', () => {
    const sources = [source('screenshot', 's1')]
    const dependsOn = ['c0']
    const before = { sources: structuredClone(sources), dependsOn: structuredClone(dependsOn) }
    createClaim({ id: 'x', text: 't', provenance: 'known-fact', sources, dependsOn })
    expect(sources).toEqual(before.sources)
    expect(dependsOn).toEqual(before.dependsOn)
  })

  it('source has no reliance on Date.now/Math.random', () => {
    const src = '' + createClaim.toString() + invalidateByConstraintChange.toString()
    expect(src).not.toMatch(/Date\.now/)
    expect(src).not.toMatch(/Math\.random/)
  })
})

describe('isProvenanceKind', () => {
  it('accepts every known kind', () => {
    for (const kind of CREDIBILITY_ORDER) expect(isProvenanceKind(kind)).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isProvenanceKind('guess')).toBe(false)
    expect(isProvenanceKind(null)).toBe(false)
    expect(isProvenanceKind(42)).toBe(false)
  })
})

describe('parseClaims', () => {
  it('parses a plain JSON array with deterministic ids', () => {
    const claims = parseClaims(
      '[{"text":"O(n) time","provenance":"ai-inference"},{"text":"sorted input","provenance":"problem-text"}]'
    )
    expect(claims).toHaveLength(2)
    expect(claims[0]).toMatchObject({ id: 'c1', text: 'O(n) time', provenance: 'ai-inference' })
    expect(claims[1]).toMatchObject({ id: 'c2', text: 'sorted input', provenance: 'problem-text' })
  })

  it('extracts the array from surrounding markdown/prose', () => {
    const claims = parseClaims('Sure!\n```json\n[{"text":"x","provenance":"assumption"}]\n```')
    expect(claims).toHaveLength(1)
    expect(claims[0].provenance).toBe('assumption')
  })

  it('drops entries with unknown provenance or empty text', () => {
    const claims = parseClaims(
      '[{"text":"keep","provenance":"known-fact"},{"text":"","provenance":"known-fact"},{"text":"drop","provenance":"nonsense"}]'
    )
    expect(claims).toEqual([expect.objectContaining({ text: 'keep', provenance: 'known-fact' })])
  })

  it('returns [] for malformed or empty input', () => {
    expect(parseClaims('')).toEqual([])
    expect(parseClaims('not json at all')).toEqual([])
    expect(parseClaims('[not valid json]')).toEqual([])
    expect(parseClaims('{"text":"x","provenance":"assumption"}')).toEqual([])
  })

  it('assigns default empty sources/dependsOn and not invalidated', () => {
    const [claim] = parseClaims('[{"text":"x","provenance":"assumption"}]')
    expect(claim.sources).toEqual([])
    expect(claim.dependsOn).toEqual([])
    expect(claim.invalidated).toBe(false)
  })
})
