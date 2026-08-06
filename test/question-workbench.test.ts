import { describe, expect, it } from 'vitest'
import { scaffoldFor, hasScaffold } from '../src/shared/question-workbench'

describe('scaffoldFor', () => {
  it('returns an ordered coding scaffold', () => {
    expect(scaffoldFor('coding').map((s) => s.id)).toEqual([
      'coding.clarify',
      'coding.examples',
      'coding.brute-force',
      'coding.optimize',
      'coding.complexity',
      'coding.code',
      'coding.tests'
    ])
  })

  it('returns the STAR behavioral scaffold', () => {
    expect(scaffoldFor('behavioral').map((s) => s.id)).toEqual([
      'behavioral.situation',
      'behavioral.task',
      'behavioral.action',
      'behavioral.result',
      'behavioral.reflection'
    ])
  })

  it('marks reflective/verification steps optional', () => {
    expect(scaffoldFor('behavioral').find((s) => s.id === 'behavioral.reflection')?.optional).toBe(
      true
    )
    expect(scaffoldFor('sql').find((s) => s.id === 'sql.verify')?.optional).toBe(true)
    expect(scaffoldFor('coding').every((s) => !s.optional)).toBe(true)
  })

  it('has a scaffold for every answerable type', () => {
    for (const type of ['coding', 'system-design', 'sql', 'behavioral', 'debugging'] as const) {
      expect(scaffoldFor(type).length).toBeGreaterThan(0)
    }
  })

  it('namespaces every step id by its type', () => {
    for (const type of ['coding', 'system-design', 'sql', 'behavioral', 'debugging'] as const) {
      for (const step of scaffoldFor(type)) {
        expect(step.id.startsWith(`${type}.`)).toBe(true)
      }
    }
  })

  it('returns [] for unknown', () => {
    expect(scaffoldFor('unknown')).toEqual([])
  })

  it('returns a copy so callers cannot mutate the shared definition', () => {
    const a = scaffoldFor('coding')
    a[0].id = 'mutated'
    expect(scaffoldFor('coding')[0].id).toBe('coding.clarify')
  })
})

describe('hasScaffold', () => {
  it('is true for answerable types and false for unknown', () => {
    expect(hasScaffold('coding')).toBe(true)
    expect(hasScaffold('system-design')).toBe(true)
    expect(hasScaffold('unknown')).toBe(false)
  })
})
