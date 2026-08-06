import { describe, expect, it } from 'vitest'
import {
  classifyQuestion,
  scoreQuestionTypes,
  type QuestionType
} from '../src/shared/question-type'

describe('classifyQuestion', () => {
  const cases: [string, QuestionType][] = [
    ['Implement a function that returns the time complexity of this array traversal', 'coding'],
    ['给定一个数组，实现一个函数返回最长子串，并分析时间复杂度', 'coding'],
    ['Design a scalable system with high availability and load balancing', 'system-design'],
    ['设计一个高可用、可扩展的消息系统架构', 'system-design'],
    ['Write a SQL query to join these database tables and group by user', 'sql'],
    ['写一条 SQL 查询，从表中按用户分组', 'sql'],
    ['Why does this code throw an error? Fix the bug in the stack trace', 'debugging'],
    ['这段代码为什么会报错？帮我修复这个 bug', 'debugging'],
    ['Tell me about a time you had a conflict in your team', 'behavioral'],
    ['讲一次你在团队中遇到冲突并解决的经历', 'behavioral']
  ]

  it.each(cases)('classifies %j as %s', (text, expected) => {
    expect(classifyQuestion(text)).toBe(expected)
  })

  it('returns unknown for empty or signal-free text', () => {
    expect(classifyQuestion('')).toBe('unknown')
    expect(classifyQuestion('   ')).toBe('unknown')
    expect(classifyQuestion('hello there, nice weather today')).toBe('unknown')
  })

  it('is deterministic', () => {
    const text = 'design a scalable architecture'
    expect(classifyQuestion(text)).toBe(classifyQuestion(text))
  })
})

describe('scoreQuestionTypes', () => {
  it('returns only non-zero scores, highest first', () => {
    const scores = scoreQuestionTypes('algorithm array complexity, tell me about a time')
    expect(scores[0].type).toBe('coding')
    expect(scores.every((s) => s.score > 0)).toBe(true)
  })

  it('breaks ties by TYPE_ORDER (coding before behavioral at equal score)', () => {
    // one coding signal + one behavioral signal → equal score, coding wins
    const scores = scoreQuestionTypes('array. conflict.')
    expect(scores[0].type).toBe('coding')
    expect(scores[0].score).toBe(scores[1].score)
  })

  it('returns [] when nothing matches', () => {
    expect(scoreQuestionTypes('nothing relevant here')).toEqual([])
  })
})
