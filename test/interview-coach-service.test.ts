import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  settings: {
    interviewCoachEnabled: false,
    realtimeAssistEnabled: true,
    proactiveAssistEnabled: false,
    memoryDistillEnabled: false,
    assistDebounceMs: 200,
    transcriptionLanguage: 'auto',
    translationEnabled: false,
    translationTargetLanguage: 'zh',
    apiKey: 'sk-test',
    userMemory: ''
  },
  streamInterviewAssist: vi.fn(() =>
    (async function* () {
      yield '先说明目标，再给出方案。'
    })()
  )
}))

vi.mock('../src/main/settings', () => ({ settings: mocks.settings }))
vi.mock('../src/main/ai', () => ({
  streamInterviewAssist: mocks.streamInterviewAssist,
  streamProactiveAssist: vi.fn(() =>
    (async function* () {
      yield '继续补充。'
    })()
  ),
  summarizeConversation: vi.fn(async () => ''),
  translateTranscriptText: vi.fn(async () => ''),
  distillMemoryCandidates: vi.fn(async () => [])
}))
vi.mock('../src/main/outbound-log', () => ({ recordEgress: vi.fn() }))
vi.mock('../src/main/session-cost', () => ({ recordCost: vi.fn() }))

import { InterviewCoachService } from '../src/main/services/interview-coach-service'

let service: InterviewCoachService | null = null

beforeEach(() => {
  mocks.settings.interviewCoachEnabled = false
  mocks.settings.realtimeAssistEnabled = true
  mocks.settings.proactiveAssistEnabled = false
  mocks.settings.assistDebounceMs = 200
  mocks.streamInterviewAssist.mockClear()
})

afterEach(() => {
  service?.reset()
  service = null
})

describe('InterviewCoachService automatic question assist', () => {
  it('detects a new interviewer question and emits tagged answer points automatically', async () => {
    const events: { channel: string; payload: Record<string, unknown> }[] = []
    service = new InterviewCoachService((channel, payload) => {
      events.push({ channel, payload: (payload ?? {}) as Record<string, unknown> })
    })

    service.handleSentence({
      text: '为什么选择这个架构？',
      isPartial: false,
      providerSpeaker: 'interviewer'
    })

    const detected = events.find((event) => event.channel === 'interview-question-detected')
    expect(detected?.payload).toMatchObject({
      question: '为什么选择这个架构？',
      turnId: 'q-1',
      revision: 0
    })

    await vi.waitFor(
      () => {
        expect(events.some((event) => event.channel === 'interview-assist')).toBe(true)
      },
      { timeout: 1000, interval: 20 }
    )

    const assist = events.find((event) => event.channel === 'interview-assist')
    expect(assist?.payload).toMatchObject({
      question: '为什么选择这个架构？',
      turnId: 'q-1',
      revision: 0,
      points: '先说明目标，再给出方案。'
    })
    expect(mocks.streamInterviewAssist).toHaveBeenCalledTimes(1)
  })
})
