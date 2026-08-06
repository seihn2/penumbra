import { describe, expect, it } from 'vitest'
import { buildTranscriptContext } from '../src/shared/transcript-context'

describe('buildTranscriptContext', () => {
  it('labels speakers and joins with newlines', () => {
    const ctx = buildTranscriptContext([
      { speaker: 'interviewer', text: '说说你的项目' },
      { speaker: 'candidate', text: '我做过一个推荐系统' }
    ])
    expect(ctx).toBe('面试官：说说你的项目\n我：我做过一个推荐系统')
  })

  it('maps unknown speaker to a readable label', () => {
    expect(buildTranscriptContext([{ speaker: 'unknown', text: '杂音' }])).toBe('某人：杂音')
  })

  it('keeps only the last maxTurns turns', () => {
    const turns = Array.from({ length: 12 }, (_, i) => ({
      speaker: 'candidate' as const,
      text: `第${i}句`
    }))
    const ctx = buildTranscriptContext(turns, { maxTurns: 3 })
    expect(ctx.split('\n')).toHaveLength(3)
    expect(ctx).toContain('第11句')
    expect(ctx).not.toContain('第8句')
  })

  it('truncates an over-long turn to its tail with an ellipsis', () => {
    const long = 'a'.repeat(300)
    const ctx = buildTranscriptContext([{ speaker: 'candidate', text: long }], {
      maxCharsPerTurn: 50
    })
    expect(ctx.startsWith('我：…')).toBe(true)
    // label + ellipsis + 50 tail chars
    expect(ctx.length).toBe('我：…'.length + 50)
  })

  it('leaves short turns untouched', () => {
    const ctx = buildTranscriptContext([{ speaker: 'candidate', text: '短' }], {
      maxCharsPerTurn: 50
    })
    expect(ctx).toBe('我：短')
  })
})
