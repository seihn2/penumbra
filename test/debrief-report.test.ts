import { describe, expect, it } from 'vitest'
import {
  averageRevisions,
  buildDebrief,
  constraintViolations,
  debriefTurnsFromTranscript,
  unansweredQuestions,
  type DebriefInput,
  type DebriefTurn,
  type TranscriptTurnLike
} from '../src/shared/debrief-report'

const turn = (m: Partial<DebriefTurn> & Pick<DebriefTurn, 'turnId'>): DebriefTurn => ({
  question: `问题 ${m.turnId}`,
  answered: true,
  answerRevisions: 0,
  interrupted: false,
  constraintsRespected: true,
  startedAt: 0,
  endedAt: null,
  ...m
})

const input = (turns: DebriefTurn[], sessionStart = 0, sessionEnd = 0): DebriefInput => ({
  turns,
  sessionStart,
  sessionEnd
})

describe('buildDebrief durationMs', () => {
  it('computes sessionEnd - sessionStart', () => {
    expect(buildDebrief(input([], 1000, 5000)).durationMs).toBe(4000)
  })

  it('floors at 0 when sessionEnd < sessionStart', () => {
    expect(buildDebrief(input([], 5000, 1000)).durationMs).toBe(0)
  })
})

describe('buildDebrief counts', () => {
  it('reports total and answered counts', () => {
    const report = buildDebrief(
      input([
        turn({ turnId: 'a', answered: true }),
        turn({ turnId: 'b', answered: false }),
        turn({ turnId: 'c', answered: true })
      ])
    )
    expect(report.totalQuestions).toBe(3)
    expect(report.answeredCount).toBe(2)
  })

  it('has zero counts for an empty session', () => {
    const report = buildDebrief(input([]))
    expect(report.totalQuestions).toBe(0)
    expect(report.answeredCount).toBe(0)
    expect(report.unansweredQuestions).toEqual([])
    expect(report.interruptedTurns).toEqual([])
    expect(report.constraintViolations).toEqual([])
    expect(report.averageRevisions).toBe(0)
    expect(report.timeline).toEqual([])
  })
})

describe('collected turn subsets', () => {
  it('collects unanswered questions by their question text', () => {
    const report = buildDebrief(
      input([
        turn({ turnId: 'a', question: '答完了', answered: true }),
        turn({ turnId: 'b', question: '没答完', answered: false })
      ])
    )
    expect(report.unansweredQuestions).toEqual(['没答完'])
  })

  it('collects interrupted turnIds', () => {
    const report = buildDebrief(
      input([turn({ turnId: 'a', interrupted: false }), turn({ turnId: 'b', interrupted: true })])
    )
    expect(report.interruptedTurns).toEqual(['b'])
  })

  it('collects constraint-violation turnIds', () => {
    const report = buildDebrief(
      input([
        turn({ turnId: 'a', constraintsRespected: true }),
        turn({ turnId: 'b', constraintsRespected: false })
      ])
    )
    expect(report.constraintViolations).toEqual(['b'])
  })

  it('returns empty arrays when nothing is flagged', () => {
    const report = buildDebrief(input([turn({ turnId: 'a' }), turn({ turnId: 'b' })]))
    expect(report.unansweredQuestions).toEqual([])
    expect(report.interruptedTurns).toEqual([])
    expect(report.constraintViolations).toEqual([])
  })
})

describe('averageRevisions', () => {
  it('computes the mean over turns', () => {
    const report = buildDebrief(
      input([
        turn({ turnId: 'a', answerRevisions: 1 }),
        turn({ turnId: 'b', answerRevisions: 2 }),
        turn({ turnId: 'c', answerRevisions: 3 })
      ])
    )
    expect(report.averageRevisions).toBe(2)
  })

  it('is 0 when there are no turns', () => {
    expect(averageRevisions([])).toBe(0)
    expect(buildDebrief(input([])).averageRevisions).toBe(0)
  })
})

describe('timeline', () => {
  it('computes durationMs as endedAt - startedAt', () => {
    const report = buildDebrief(
      input([turn({ turnId: 'a', question: 'Q1', startedAt: 100, endedAt: 400 })])
    )
    expect(report.timeline).toEqual([{ turnId: 'a', question: 'Q1', durationMs: 300 }])
  })

  it('uses null durationMs when endedAt is null', () => {
    const report = buildDebrief(
      input([turn({ turnId: 'a', question: 'Q1', startedAt: 100, endedAt: null })])
    )
    expect(report.timeline).toEqual([{ turnId: 'a', question: 'Q1', durationMs: null }])
  })
})

describe('improvements', () => {
  it('is empty for a clean run', () => {
    const report = buildDebrief(input([turn({ turnId: 'a' }), turn({ turnId: 'b' })]))
    expect(report.improvements).toEqual([])
  })

  it('flags unanswered questions', () => {
    const report = buildDebrief(input([turn({ turnId: 'a', answered: false })]))
    expect(report.improvements).toContain('练习把题目答完整')
  })

  it('flags constraint violations', () => {
    const report = buildDebrief(input([turn({ turnId: 'a', constraintsRespected: false })]))
    expect(report.improvements).toContain('注意遵守题目约束/边界')
  })

  it('flags high average revisions (> 2)', () => {
    const report = buildDebrief(input([turn({ turnId: 'a', answerRevisions: 3 })]))
    expect(report.improvements).toContain('先想清楚再作答，减少反复')
  })

  it('does not flag revisions at exactly the threshold of 2', () => {
    const report = buildDebrief(input([turn({ turnId: 'a', answerRevisions: 2 })]))
    expect(report.improvements).not.toContain('先想清楚再作答，减少反复')
  })

  it('flags interrupted turns', () => {
    const report = buildDebrief(input([turn({ turnId: 'a', interrupted: true })]))
    expect(report.improvements).toContain('练习被打断后快速回到主线')
  })

  it('returns a de-duplicated ordered list when several rules fire', () => {
    const report = buildDebrief(
      input([
        turn({
          turnId: 'a',
          answered: false,
          constraintsRespected: false,
          answerRevisions: 5,
          interrupted: true
        })
      ])
    )
    expect(report.improvements).toEqual([
      '练习把题目答完整',
      '注意遵守题目约束/边界',
      '先想清楚再作答，减少反复',
      '练习被打断后快速回到主线'
    ])
    // No duplicates.
    expect(new Set(report.improvements).size).toBe(report.improvements.length)
  })
})

describe('nextPracticePlan', () => {
  it('gives a deterministic clean-run plan when nothing is flagged', () => {
    const report = buildDebrief(input([turn({ turnId: 'a' })]))
    expect(report.nextPracticePlan).toEqual(['保持当前节奏，尝试更高难度的题目'])
  })

  it('derives plan items from the flagged issues, in order', () => {
    const report = buildDebrief(
      input([
        turn({
          turnId: 'a',
          answered: false,
          constraintsRespected: false,
          answerRevisions: 5,
          interrupted: true
        })
      ])
    )
    expect(report.nextPracticePlan).toEqual([
      '安排限时答题训练，确保每题给出完整解答',
      '刷带明确约束/边界条件的题目，作答前先复述约束',
      '作答前先在草稿上梳理思路，减少中途返工',
      '模拟被追问/打断的场景，训练快速回到主线'
    ])
  })

  it('is deterministic across repeated calls on the same input', () => {
    const data = input([turn({ turnId: 'a', answered: false })])
    expect(buildDebrief(data).nextPracticePlan).toEqual(buildDebrief(data).nextPracticePlan)
  })
})

describe('purity', () => {
  it('does not mutate the input turns or arrays', () => {
    const turns = [
      turn({ turnId: 'a', answered: false, interrupted: true }),
      turn({ turnId: 'b', constraintsRespected: false })
    ]
    const snapshot = JSON.parse(JSON.stringify(turns))
    const original = input(turns, 100, 900)
    buildDebrief(original)
    expect(turns).toEqual(snapshot)
    expect(original.turns).toBe(turns)
    expect(original.turns.length).toBe(2)
  })

  it('does not use Date.now or Math.random (deterministic output)', () => {
    const data = input([turn({ turnId: 'a', startedAt: 0, endedAt: 500 })], 0, 500)
    expect(buildDebrief(data)).toEqual(buildDebrief(data))
  })
})

describe('helper selectors', () => {
  it('unansweredQuestions returns only unanswered questions', () => {
    expect(
      unansweredQuestions([
        turn({ turnId: 'a', question: 'kept', answered: false }),
        turn({ turnId: 'b', question: 'dropped', answered: true })
      ])
    ).toEqual(['kept'])
  })

  it('constraintViolations returns only violating turnIds', () => {
    expect(
      constraintViolations([
        turn({ turnId: 'a', constraintsRespected: false }),
        turn({ turnId: 'b', constraintsRespected: true })
      ])
    ).toEqual(['a'])
  })
})

describe('debriefTurnsFromTranscript', () => {
  const t = (
    id: string,
    speaker: TranscriptTurnLike['speaker'],
    text: string,
    timestamp: number
  ): TranscriptTurnLike => ({ id, speaker, text, timestamp })

  it('opens a turn per interviewer line and answers it with the next candidate line', () => {
    const turns = debriefTurnsFromTranscript([
      t('1', 'interviewer', '介绍一下二叉树', 1000),
      t('2', 'candidate', '二叉树是……', 2000)
    ])
    expect(turns).toHaveLength(1)
    expect(turns[0]).toMatchObject({
      turnId: '1',
      question: '介绍一下二叉树',
      answered: true,
      interrupted: false,
      startedAt: 1000,
      endedAt: 2000
    })
  })

  it('marks a question interrupted when a new question arrives before any answer', () => {
    const turns = debriefTurnsFromTranscript([
      t('1', 'interviewer', '第一题', 1000),
      t('2', 'interviewer', '换个问题', 1500),
      t('3', 'candidate', '好的', 2000)
    ])
    expect(turns).toHaveLength(2)
    expect(turns[0]).toMatchObject({ answered: false, interrupted: true, endedAt: null })
    expect(turns[1]).toMatchObject({ answered: true, interrupted: false, endedAt: 2000 })
  })

  it('leaves the last unanswered question open, not interrupted', () => {
    const turns = debriefTurnsFromTranscript([t('1', 'interviewer', '最后一题', 1000)])
    expect(turns[0]).toMatchObject({ answered: false, interrupted: false, endedAt: null })
  })

  it('ignores unknown-speaker and blank lines, and candidate lines with no open question', () => {
    const turns = debriefTurnsFromTranscript([
      t('1', 'candidate', '随便说的', 500),
      t('2', 'unknown', '噪声', 700),
      t('3', 'interviewer', '   ', 800),
      t('4', 'interviewer', '真问题', 900),
      t('5', 'candidate', '回答', 1000)
    ])
    expect(turns).toHaveLength(1)
    expect(turns[0]).toMatchObject({ turnId: '4', question: '真问题', answered: true })
  })

  it('uses neutral defaults for unobservable fields', () => {
    const turns = debriefTurnsFromTranscript([t('1', 'interviewer', 'Q', 0)])
    expect(turns[0].answerRevisions).toBe(0)
    expect(turns[0].constraintsRespected).toBe(true)
  })

  it('feeds cleanly into buildDebrief', () => {
    const derived = debriefTurnsFromTranscript([
      t('1', 'interviewer', 'Q1', 1000),
      t('2', 'candidate', 'A1', 2000),
      t('3', 'interviewer', 'Q2', 3000)
    ])
    const report = buildDebrief({ turns: derived, sessionStart: 1000, sessionEnd: 4000 })
    expect(report.totalQuestions).toBe(2)
    expect(report.answeredCount).toBe(1)
    expect(report.unansweredQuestions).toEqual(['Q2'])
  })
})
