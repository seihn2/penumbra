import { describe, expect, it } from 'vitest'
import {
  createInterviewQuestionDetectionState,
  forceInterviewQuestion,
  processFinalInterviewTurn
} from '../src/shared/interview-question-detection'
import { currentQuestion, isStaleResponse } from '../src/shared/question-machine'

describe('interview question detection', () => {
  it('buffers interviewer context but emits only when it becomes a question', () => {
    let state = createInterviewQuestionDetectionState()
    let result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '先聊一下你最近的项目',
      now: 1
    })
    expect(result.detected).toBeNull()

    state = result.state
    result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '你在里面解决了什么最难的问题？',
      now: 2
    })
    expect(result.detected?.question).toBe('先聊一下你最近的项目 你在里面解决了什么最难的问题？')
  })

  it('treats consecutive interviewer clarification as one revised question', () => {
    let state = createInterviewQuestionDetectionState()
    let result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '请设计一个缓存系统？',
      now: 1
    })
    const first = result.detected!

    state = result.state
    result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '需要支持 LRU 和并发访问。',
      now: 2
    })
    expect(result.detected).toMatchObject({ turnId: first.turnId, revision: 1 })
    expect(result.detected?.question).toContain('LRU')
    expect(isStaleResponse(result.state.machine, first.turnId, first.revision)).toBe(true)
  })

  it('starts a new turn after the candidate begins answering', () => {
    let state = createInterviewQuestionDetectionState()
    let result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '你的项目是什么？',
      now: 1
    })
    const firstTurnId = result.detected?.turnId

    state = processFinalInterviewTurn(result.state, {
      speaker: 'candidate',
      text: '我负责搜索服务。',
      now: 2
    }).state
    expect(currentQuestion(state.machine)?.status).toBe('answering')

    result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '那你怎么保证高可用？',
      now: 3
    })
    expect(result.detected?.turnId).not.toBe(firstTurnId)
    expect(isStaleResponse(result.state.machine, firstTurnId!, 0)).toBe(true)
  })

  it('does not classify candidate questions as interviewer questions', () => {
    const result = processFinalInterviewTurn(createInterviewQuestionDetectionState(), {
      speaker: 'candidate',
      text: '我可以先确认一下数据规模吗？',
      now: 1
    })
    expect(result.detected).toBeNull()
    expect(currentQuestion(result.state.machine)).toBeNull()
  })

  it('breaks a stale interviewer sequence after a long gap', () => {
    const state = processFinalInterviewTurn(createInterviewQuestionDetectionState(), {
      speaker: 'interviewer',
      text: '先讲一下你的经历？',
      now: 1
    }).state
    const oldTurnId = currentQuestion(state.machine)?.turnId

    const result = processFinalInterviewTurn(state, {
      speaker: 'interviewer',
      text: '为什么选择这个架构？',
      now: 30001
    })
    expect(result.detected?.turnId).not.toBe(oldTurnId)
    expect(result.detected?.question).toBe('为什么选择这个架构？')
  })

  it('supports a manual fallback for a non-question interviewer line', () => {
    const result = forceInterviewQuestion(createInterviewQuestionDetectionState(), {
      text: '继续讲讲这个项目',
      now: 1
    })
    expect(result.detected?.question).toBe('继续讲讲这个项目')
  })
})
