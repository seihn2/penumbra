import { describe, expect, it } from 'vitest'
import { transcriptToMarkdown } from '../src/renderer/src/coder/interview/transcript-export'
import type { TranscriptTurn } from '../src/shared/interview-coach'
import type { AssistItem } from '../src/renderer/src/lib/store/transcription'

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

const assist = (m: Partial<AssistItem> & Pick<AssistItem, 'question' | 'points'>): AssistItem => ({
  timestamp: 0,
  ...m
})

// A fixed local time so the HH:MM:SS formatting assertion is deterministic.
const at = (h: number, min: number, s: number): number => new Date(2026, 0, 1, h, min, s).getTime()

describe('transcriptToMarkdown', () => {
  it('returns empty string when turns, assists and summary are all empty', () => {
    expect(transcriptToMarkdown([], [], '')).toBe('')
    expect(transcriptToMarkdown([], [], '   ')).toBe('')
  })

  it('includes the topic summary section when a summary is present', () => {
    const md = transcriptToMarkdown([], [], '本轮聚焦两数之和')
    expect(md).toContain('# Penumbra 面试记录')
    expect(md).toContain('## 话题总结')
    expect(md).toContain('本轮聚焦两数之和')
  })

  it('includes the timeline section with speaker labels', () => {
    const md = transcriptToMarkdown(
      [
        turn({ speaker: 'interviewer', text: '请介绍一下你的思路' }),
        turn({ speaker: 'candidate', text: '我会用哈希表' })
      ],
      [],
      ''
    )
    expect(md).toContain('## 对话时间线')
    expect(md).toContain('**面试官**：请介绍一下你的思路')
    expect(md).toContain('**我**：我会用哈希表')
  })

  it('filters out partial turns', () => {
    const md = transcriptToMarkdown(
      [
        turn({ speaker: 'candidate', text: '已确认的内容' }),
        turn({ speaker: 'candidate', text: '还在识别的内容', isPartial: true })
      ],
      [],
      ''
    )
    expect(md).toContain('已确认的内容')
    expect(md).not.toContain('还在识别的内容')
  })

  it('includes the AI assist section with question and points', () => {
    const md = transcriptToMarkdown(
      [],
      [{ ...assist({ question: '如何优化复杂度？', points: '使用哈希表降到 O(n)' }) }],
      ''
    )
    expect(md).toContain('## AI 回答要点')
    expect(md).toContain('如何优化复杂度？')
    expect(md).toContain('使用哈希表降到 O(n)')
  })

  it('formats timestamps as HH:MM:SS', () => {
    const md = transcriptToMarkdown(
      [turn({ speaker: 'interviewer', text: '开始吧', timestamp: at(9, 5, 3) })],
      [assist({ question: '问题', points: '要点', timestamp: at(14, 30, 7) })],
      ''
    )
    expect(md).toContain('`09:05:03`')
    expect(md).toContain('14:30:07')
  })

  it('includes an interview stats section with speaker counts and duration', () => {
    const md = transcriptToMarkdown(
      [
        turn({ speaker: 'interviewer', text: '你用什么数据结构？', timestamp: at(9, 0, 0) }),
        turn({ speaker: 'candidate', text: '哈希表', timestamp: at(9, 1, 0) })
      ],
      [],
      ''
    )
    expect(md).toContain('## 面试统计')
    expect(md).toContain('面试官 1 · 我 1')
    expect(md).toContain('面试官提问：1')
    expect(md).toContain('1m 0s')
  })

  it('adds a low-speaking-share note when the candidate barely spoke', () => {
    const longQuestion =
      '请详细介绍一下你做过的最复杂的项目，包括技术选型、你承担的角色、遇到的最大挑战，以及你是如何一步步解决并最终落地上线的整个过程，越具体越好，最好能讲清楚每个关键决策背后的取舍'
    const md = transcriptToMarkdown(
      [
        turn({ speaker: 'interviewer', text: longQuestion }),
        turn({ speaker: 'candidate', text: '嗯' })
      ],
      [],
      ''
    )
    expect(md).toContain('你的发言偏少')
  })

  it('omits the low-share note when speaking is balanced', () => {
    const md = transcriptToMarkdown(
      [
        turn({ speaker: 'interviewer', text: '简单说说你的方案' }),
        turn({ speaker: 'candidate', text: '我会先分析复杂度再用哈希表优化到线性时间然后处理边界' })
      ],
      [],
      ''
    )
    expect(md).not.toContain('你的发言偏少')
  })
})
