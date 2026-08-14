import { describe, expect, it } from 'vitest'
import { collectSpokenInterviewAnswer } from '../src/shared/interview-answer-memory'
import type { TranscriptTurn } from '../src/shared/interview-coach'

function turn(
  timestamp: number,
  speaker: TranscriptTurn['speaker'],
  text: string,
  isPartial = false
): TranscriptTurn {
  return {
    id: String(timestamp),
    speaker,
    speakerSource: 'provider',
    text,
    isPartial,
    language: 'zh',
    timestamp
  }
}

describe('spoken interview answer memory', () => {
  it('keeps only finalized candidate speech inside the current question window', () => {
    const answer = collectSpokenInterviewAnswer({
      questionTimestamp: 10_000,
      nextQuestionTimestamp: 20_000,
      turns: [
        turn(7_000, 'candidate', '上一题的结尾'),
        turn(9_000, 'interviewer', '请介绍这个项目'),
        turn(10_500, 'candidate', '我先说项目目标', true),
        turn(11_000, 'candidate', '我先说项目目标'),
        turn(14_000, 'candidate', '然后说明关键取舍'),
        turn(20_000, 'candidate', '下一题的回答')
      ]
    })

    expect(answer).toBe('我先说项目目标\n然后说明关键取舍')
  })

  it('keeps a short preroll for overlapping speech without duplicating lines', () => {
    const answer = collectSpokenInterviewAnswer({
      questionTimestamp: 10_000,
      turns: [
        turn(8_200, 'candidate', '我理解这个问题'),
        turn(8_200, 'candidate', '我理解这个问题'),
        turn(10_200, 'candidate', '核心是状态机')
      ]
    })

    expect(answer).toBe('我理解这个问题\n核心是状态机')
  })
})
