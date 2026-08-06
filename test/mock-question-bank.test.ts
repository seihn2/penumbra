import { describe, expect, it } from 'vitest'
import { bankQuestions, pickBankQuestion } from '../src/shared/mock-question-bank'
import type { Difficulty, Track } from '../src/shared/mock-interview'

const TRACKS: Track[] = ['behavioral', 'system-design', 'coding']
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard']

describe('mock-question-bank', () => {
  it('has non-empty prompts for every track/difficulty combination', () => {
    for (const track of TRACKS) {
      for (const diff of DIFFS) {
        const qs = bankQuestions(track, diff)
        expect(qs.length).toBeGreaterThan(0)
        for (const q of qs) expect(q.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('picks deterministically by index', () => {
    expect(pickBankQuestion('coding', 'easy', 0)).toBe(pickBankQuestion('coding', 'easy', 0))
  })

  it('wraps the index around the bucket size', () => {
    const qs = bankQuestions('coding', 'easy')
    expect(pickBankQuestion('coding', 'easy', qs.length)).toBe(
      pickBankQuestion('coding', 'easy', 0)
    )
  })

  it('handles negative indices without throwing', () => {
    const qs = bankQuestions('behavioral', 'medium')
    expect(qs).toContain(pickBankQuestion('behavioral', 'medium', -1))
  })

  it('returns a prompt that belongs to the requested bucket', () => {
    const qs = bankQuestions('system-design', 'hard')
    expect(qs).toContain(pickBankQuestion('system-design', 'hard', 1))
  })

  it('bankQuestions returns a copy (mutating it does not affect later reads)', () => {
    const first = bankQuestions('coding', 'medium')
    first.push('injected')
    expect(bankQuestions('coding', 'medium')).not.toContain('injected')
  })
})
