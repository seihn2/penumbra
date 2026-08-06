import { describe, expect, it } from 'vitest'
import {
  buildLiveCue,
  estimateSpeakingSeconds,
  progressThroughPoints,
  remainingSeconds,
  resumePointAfterInterruption,
  shouldFreezeSuggestions,
  shouldShowScore,
  type SpokenAnswer
} from '../src/shared/spoken-coach'

const answer = (over: Partial<SpokenAnswer> = {}): SpokenAnswer => ({
  opener: '我用状态机把音频源解耦',
  points: ['状态机管理连接', '指数退避重连', '双源说话人归属'],
  byLength: {
    '30s': '短版本',
    '60s': '中等版本，稍微展开一些内容',
    deep: '深入版本，覆盖架构取舍、边界情况与替代方案'
  },
  ...over
})

describe('buildLiveCue', () => {
  it('leaves a short opener and few points untouched', () => {
    const cue = buildLiveCue(answer())
    expect(cue.opener).toBe('我用状态机把音频源解耦')
    expect(cue.points).toEqual(['状态机管理连接', '指数退避重连', '双源说话人归属'])
  })

  it('truncates a 40-char Chinese opener to 30 code points with an ellipsis', () => {
    const longOpener = '啊'.repeat(40)
    const cue = buildLiveCue(answer({ opener: longOpener }))
    expect(Array.from(cue.opener).length).toBe(30)
    expect(cue.opener.endsWith('…')).toBe(true)
    expect(cue.opener).toBe('啊'.repeat(29) + '…')
  })

  it('caps the cue to at most 3 points', () => {
    const cue = buildLiveCue(answer({ points: ['一', '二', '三', '四', '五'] }))
    expect(cue.points).toHaveLength(3)
    expect(cue.points).toEqual(['一', '二', '三'])
  })

  it('truncates each point to 24 code points with an ellipsis', () => {
    const longPoint = '要'.repeat(30)
    const cue = buildLiveCue(answer({ points: [longPoint] }))
    expect(Array.from(cue.points[0]).length).toBe(24)
    expect(cue.points[0]).toBe('要'.repeat(23) + '…')
  })

  it('does not append an ellipsis when nothing is truncated', () => {
    const cue = buildLiveCue(answer({ opener: '简短', points: ['要点'] }))
    expect(cue.opener).toBe('简短')
    expect(cue.opener.includes('…')).toBe(false)
    expect(cue.points[0].includes('…')).toBe(false)
  })

  it('counts CJK by code point, not surrogate pairs (astral glyphs count as one)', () => {
    const astral = '𠀀'.repeat(40)
    const cue = buildLiveCue(answer({ opener: astral }))
    expect(Array.from(cue.opener).length).toBe(30)
  })
})

describe('estimateSpeakingSeconds', () => {
  it('is deterministic for the same input', () => {
    const text = '一二三四五六七八'
    expect(estimateSpeakingSeconds(text)).toBe(estimateSpeakingSeconds(text))
  })

  it('uses ceil(charCount / cps) with the default 4 cps', () => {
    expect(estimateSpeakingSeconds('一二三四五六七八')).toBe(2)
    expect(estimateSpeakingSeconds('一二三四五')).toBe(2)
  })

  it('scales up with longer text', () => {
    const short = estimateSpeakingSeconds('一'.repeat(8))
    const long = estimateSpeakingSeconds('一'.repeat(40))
    expect(long).toBeGreaterThan(short)
  })

  it('returns 0 for empty text', () => {
    expect(estimateSpeakingSeconds('')).toBe(0)
  })

  it('honours a custom cps', () => {
    expect(estimateSpeakingSeconds('一'.repeat(20), 10)).toBe(2)
  })
})

describe('remainingSeconds', () => {
  it('returns the difference when time is left', () => {
    expect(remainingSeconds(60, 20)).toBe(40)
  })

  it('floors at 0 when elapsed exceeds total', () => {
    expect(remainingSeconds(30, 45)).toBe(0)
  })

  it('returns 0 exactly at the limit', () => {
    expect(remainingSeconds(30, 30)).toBe(0)
  })
})

describe('progressThroughPoints', () => {
  const points = ['状态机管理连接', '指数退避重连', '双源说话人归属']

  it('returns 0 when nothing has been spoken', () => {
    expect(progressThroughPoints(points, '')).toBe(0)
  })

  it('counts points whose keyword appears in the transcript', () => {
    const spoken = '我先讲状态机管理连接，然后是指数退避重连的策略'
    expect(progressThroughPoints(points, spoken)).toBe(2)
  })

  it('counts all points when all keywords are present', () => {
    const spoken = '状态机管理连接、指数退避重连、双源说话人归属都说完了'
    expect(progressThroughPoints(points, spoken)).toBe(3)
  })

  it('matches keywords case-insensitively', () => {
    expect(progressThroughPoints(['Retry logic', 'Backoff'], 'i handled RETRY LOGIC first')).toBe(1)
  })
})

describe('shouldFreezeSuggestions', () => {
  it('freezes while the candidate is speaking', () => {
    expect(shouldFreezeSuggestions(true)).toBe(true)
  })

  it('does not freeze while silent', () => {
    expect(shouldFreezeSuggestions(false)).toBe(false)
  })
})

describe('shouldShowScore', () => {
  it('hides the score in a live interview', () => {
    expect(shouldShowScore('live')).toBe(false)
  })

  it('shows the score in practice mode', () => {
    expect(shouldShowScore('practice')).toBe(true)
  })
})

describe('resumePointAfterInterruption', () => {
  const points = ['开场', '细节', '收尾']

  it('returns the next uncovered point', () => {
    expect(resumePointAfterInterruption(points, 1)).toBe('细节')
  })

  it('returns the first point when nothing is covered yet', () => {
    expect(resumePointAfterInterruption(points, 0)).toBe('开场')
  })

  it('returns null when every point is covered', () => {
    expect(resumePointAfterInterruption(points, 3)).toBeNull()
  })

  it('returns null for an empty point list', () => {
    expect(resumePointAfterInterruption([], 0)).toBeNull()
  })
})

describe('purity', () => {
  it('does not reference Date.now or Math.random in the source', async () => {
    const { readFile } = await import('node:fs/promises')
    const src = await readFile(new URL('../src/shared/spoken-coach.ts', import.meta.url), 'utf8')
    expect(src.includes('Date.now')).toBe(false)
    expect(src.includes('Math.random')).toBe(false)
  })
})
