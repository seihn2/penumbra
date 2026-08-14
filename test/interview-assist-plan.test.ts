import { describe, expect, it } from 'vitest'
import { parseInterviewAssistPlan } from '../src/shared/interview-assist-plan'

describe('parseInterviewAssistPlan', () => {
  it('parses the streaming-friendly assist protocol', () => {
    const plan = parseInterviewAssistPlan(`[TYPE] project
[OPENING]
我先讲这个项目解决的问题和我负责的核心链路。
[PATH]
- 先说业务背景
- 再讲请求如何经过网关和服务层
3. 最后给结果和取舍
[EVIDENCE]
- 延迟从 800ms 降到 230ms
[FOLLOW_UP]
- 为什么不用消息队列？
[AVOID]
- 不要把团队成果都说成个人完成`)

    expect(plan.kind).toBe('project')
    expect(plan.opening).toContain('我先讲')
    expect(plan.path).toEqual(['先说业务背景', '再讲请求如何经过网关和服务层', '最后给结果和取舍'])
    expect(plan.evidence).toEqual(['延迟从 800ms 降到 230ms'])
    expect(plan.followUps).toEqual(['为什么不用消息队列？'])
    expect(plan.avoid).toEqual(['不要把团队成果都说成个人完成'])
  })

  it('keeps partial streaming content usable', () => {
    const plan = parseInterviewAssistPlan(`[TYPE] concept
[OPENING]
它本质上是用空间换时间。
[PATH]
- 先定义`)

    expect(plan.structured).toBe(true)
    expect(plan.kind).toBe('concept')
    expect(plan.opening).toBe('它本质上是用空间换时间。')
    expect(plan.path).toEqual(['先定义'])
  })

  it('falls back cleanly for providers that ignore the protocol', () => {
    const raw = '- 先讲背景\n- 再讲方案'
    expect(parseInterviewAssistPlan(raw)).toMatchObject({ structured: false, raw })
  })
})
