import { describe, expect, it } from 'vitest'
import {
  summarizeInterviewStats,
  formatDuration,
  isLowCandidateShare
} from '../src/shared/interview-stats'
import type { TranscriptTurn } from '../src/shared/interview-coach'

const turn = (
  m: Partial<TranscriptTurn> & Pick<TranscriptTurn, 'speaker' | 'text'>
): TranscriptTurn => ({
  id: 'turn-1',
  speakerSource: 'heuristic',
  isPartial: false,
  language: 'zh',
  timestamp: 0,
  ...m
})

const at = (h: number, min: number, s: number): number => new Date(2026, 0, 1, h, min, s).getTime()

describe('summarizeInterviewStats', () => {
  it('returns zeros for an empty transcript', () => {
    const stats = summarizeInterviewStats([])
    expect(stats).toEqual({
      totalTurns: 0,
      interviewerTurns: 0,
      candidateTurns: 0,
      unknownTurns: 0,
      questionCount: 0,
      durationSeconds: 0,
      interviewerChars: 0,
      candidateChars: 0,
      candidateShare: 0
    })
  })

  it('computes candidate speaking share from character counts', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '七个字的问题啊' }), // 7 chars
      turn({ speaker: 'candidate', text: '三个字' }) // 3 chars
    ])
    expect(stats.interviewerChars).toBe(7)
    expect(stats.candidateChars).toBe(3)
    expect(stats.candidateShare).toBeCloseTo(0.3, 5)
  })

  it('share is 0 when nobody has spoken known turns', () => {
    const stats = summarizeInterviewStats([turn({ speaker: 'unknown', text: '杂音' })])
    expect(stats.candidateShare).toBe(0)
  })

  it('ignores partial and empty turns', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'candidate', text: '已确认' }),
      turn({ speaker: 'candidate', text: '识别中', isPartial: true }),
      turn({ speaker: 'interviewer', text: '   ' })
    ])
    expect(stats.totalTurns).toBe(1)
    expect(stats.candidateTurns).toBe(1)
    expect(stats.interviewerTurns).toBe(0)
  })

  it('counts turns per speaker including unknown', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '你好' }),
      turn({ speaker: 'candidate', text: '你好' }),
      turn({ speaker: 'unknown', text: '杂音' })
    ])
    expect(stats.interviewerTurns).toBe(1)
    expect(stats.candidateTurns).toBe(1)
    expect(stats.unknownTurns).toBe(1)
    expect(stats.totalTurns).toBe(3)
  })

  it('counts interviewer questions via marks and cues', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '请介绍一下你的思路' }), // 介绍 not a lite cue
      turn({ speaker: 'interviewer', text: '你用的是什么数据结构' }), // 什么
      turn({ speaker: 'interviewer', text: 'Can you explain the complexity?' }), // ?
      turn({ speaker: 'candidate', text: '为什么这样设计' }) // candidate cue not counted
    ])
    expect(stats.questionCount).toBe(2)
  })

  it('does not count statements that merely contain a question substring', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: 'However that also works well' }), // "how" inside "however"
      turn({ speaker: 'interviewer', text: 'How would you scale this' }) // standalone "how"
    ])
    expect(stats.questionCount).toBe(1)
  })

  it('computes duration from first to last finalized turn', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '开始', timestamp: at(9, 0, 0) }),
      turn({ speaker: 'candidate', text: '好的', timestamp: at(9, 2, 30) })
    ])
    expect(stats.durationSeconds).toBe(150)
  })

  it('reports zero duration for a single turn', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '开始', timestamp: at(9, 0, 0) })
    ])
    expect(stats.durationSeconds).toBe(0)
  })

  it('is pure — same input yields same output', () => {
    const turns = [turn({ speaker: 'interviewer', text: '什么', timestamp: at(9, 0, 0) })]
    expect(summarizeInterviewStats(turns)).toEqual(summarizeInterviewStats(turns))
  })
})

describe('formatDuration', () => {
  it('formats sub-minute durations as seconds', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(45)).toBe('45s')
  })

  it('formats minute-plus durations as Mm Ss', () => {
    expect(formatDuration(60)).toBe('1m 0s')
    expect(formatDuration(150)).toBe('2m 30s')
  })

  it('formats hour-plus durations with hours', () => {
    expect(formatDuration(3600)).toBe('1h 0m 0s')
    expect(formatDuration(5430)).toBe('1h 30m 30s')
  })
})

describe('isLowCandidateShare', () => {
  const longText =
    '你能不能从头到尾详细讲一下这个项目的背景、你在其中承担的具体职责、团队规模和协作方式、关键技术决策背后的取舍、上线后遇到的问题以及你是怎么一步一步排查定位并最终解决的'

  it('flags low share once enough has been spoken', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: longText }),
      turn({ speaker: 'candidate', text: '嗯' })
    ])
    expect(isLowCandidateShare(stats)).toBe(true)
  })

  it('does not flag when speaking is balanced', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '说说思路' }),
      turn({ speaker: 'candidate', text: longText })
    ])
    expect(isLowCandidateShare(stats)).toBe(false)
  })

  it('does not flag before enough content (avoids early false alarms)', () => {
    const stats = summarizeInterviewStats([
      turn({ speaker: 'interviewer', text: '你好啊朋友' }),
      turn({ speaker: 'candidate', text: '嗯' })
    ])
    expect(isLowCandidateShare(stats)).toBe(false)
  })
})
