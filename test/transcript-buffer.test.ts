import { describe, expect, it } from 'vitest'
import { TranscriptBuffer } from '../src/main/transcript-buffer'

describe('TranscriptBuffer', () => {
  it('concatenates finalized single-source text without labels', () => {
    const b = new TranscriptBuffer()
    b.add('system', '你好', false, false)
    b.add('system', '世界', false, false)
    expect(b.getText(false)).toBe('你好世界')
  })

  it('labels finalized lines per speaker in dual-source mode', () => {
    const b = new TranscriptBuffer()
    b.add('system', '请介绍项目', false, true)
    b.add('microphone', '好的', false, true)
    expect(b.getText(true)).toBe('面试官：请介绍项目\n我：好的\n')
  })

  it('appends current partials after finalized text', () => {
    const b = new TranscriptBuffer()
    b.add('system', '已确定', false, false)
    b.add('system', '进行中', true, false)
    expect(b.getText(false)).toBe('已确定进行中')
  })

  it('clears a source partial once it is finalized', () => {
    const b = new TranscriptBuffer()
    b.add('microphone', '草稿', true, false)
    b.add('microphone', '最终', false, false)
    expect(b.getText(false)).toBe('最终')
  })

  it('labels dual-source partials too', () => {
    const b = new TranscriptBuffer()
    b.add('microphone', '思考中', true, true)
    expect(b.getText(true)).toBe('我：思考中')
  })

  it('caps accumulated length, keeping the most recent text', () => {
    const b = new TranscriptBuffer(10)
    b.add('system', '12345', false, false)
    b.add('system', '67890', false, false)
    b.add('system', 'ABCDE', false, false)
    const text = b.getText(false)
    expect(text.length).toBeLessThanOrEqual(10)
    expect(text.endsWith('ABCDE')).toBe(true)
  })

  it('trims at a newline boundary so labeled lines are not split', () => {
    // Each dual-source line is "面试官：X\n" (6 chars). With a 14-char cap, after
    // three lines (18 chars) the buffer overflows and must drop the oldest whole
    // line rather than leave a half line at the front.
    const b = new TranscriptBuffer(14)
    b.add('system', 'A', false, true)
    b.add('system', 'B', false, true)
    b.add('system', 'C', false, true)
    const text = b.getText(true)
    expect(text.length).toBeLessThanOrEqual(14)
    // The kept text starts at a clean line boundary (a full label), not mid-line.
    expect(text.startsWith('面试官：')).toBe(true)
    expect(text).toBe('面试官：B\n面试官：C\n')
  })

  it('keeps partials from both sources separated by a newline in dual mode', () => {
    const b = new TranscriptBuffer()
    b.add('system', '面试官说话中', true, true)
    b.add('microphone', '我在思考', true, true)
    expect(b.getText(true)).toBe('面试官：面试官说话中\n我：我在思考')
  })

  it('switches labelling when dualSource changes between adds', () => {
    const b = new TranscriptBuffer()
    b.add('system', '甲', false, false)
    b.add('system', '乙', false, true)
    // First add was unlabeled, second add is labeled — both retained as written.
    expect(b.getText(true)).toBe('甲面试官：乙\n')
  })

  it('re-accumulates after reset', () => {
    const b = new TranscriptBuffer()
    b.add('system', '第一段', false, false)
    b.reset()
    expect(b.getText(false)).toBe('')
    b.add('microphone', '第二段', false, false)
    expect(b.getText(false)).toBe('第二段')
  })

  it('reset clears everything', () => {
    const b = new TranscriptBuffer()
    b.add('system', 'x', false, false)
    b.add('microphone', 'y', true, false)
    b.reset()
    expect(b.getText(false)).toBe('')
  })
})
