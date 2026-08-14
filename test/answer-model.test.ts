import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  openAIOptions: [] as Array<Record<string, unknown>>,
  settings: {
    apiBaseURL: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    model: 'test-model',
    answerApiProtocol: 'auto' as 'auto' | 'responses' | 'chat-completions' | 'anthropic-messages'
  }
}))

vi.mock('../src/main/settings', () => ({ settings: mocks.settings }))
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: (options: Record<string, unknown>) => {
    mocks.openAIOptions.push(options)
    return {
      responses: (model: string) => ({ protocol: 'responses', model }),
      chat: (model: string) => ({ protocol: 'chat-completions', model })
    }
  }
}))
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: () => (model: string) => ({ protocol: 'anthropic-messages', model })
}))

import { runWithAnswerModel, streamWithAnswerModel } from '../src/main/answer-model'

describe('answer model protocol fallback', () => {
  beforeEach(() => {
    mocks.openAIOptions.length = 0
    mocks.settings.apiBaseURL = 'https://api.openai.com/v1'
    mocks.settings.answerApiProtocol = 'auto'
  })

  it('falls back before output when the preferred route is unavailable', async () => {
    const protocols: string[] = []
    const result = await runWithAnswerModel(async (_model, protocol) => {
      protocols.push(protocol)
      if (protocol === 'responses') {
        throw Object.assign(new Error('route not found'), { statusCode: 404 })
      }
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(protocols).toEqual(['responses', 'chat-completions'])
  })

  it('does not override an explicit protocol selection', async () => {
    mocks.settings.answerApiProtocol = 'responses'
    const protocols: string[] = []
    await expect(
      runWithAnswerModel(async (_model, protocol) => {
        protocols.push(protocol)
        throw Object.assign(new Error('route not found'), { statusCode: 404 })
      })
    ).rejects.toThrow('route not found')
    expect(protocols).toEqual(['responses'])
  })

  it('does not switch protocols after partial stream output', async () => {
    const protocols: string[] = []
    const stream = streamWithAnswerModel((_model, protocol) =>
      (async function* () {
        protocols.push(protocol)
        yield 'partial'
        throw Object.assign(new Error('route not found'), { statusCode: 404 })
      })()
    )

    const chunks: string[] = []
    await expect(
      (async () => {
        for await (const chunk of stream) chunks.push(chunk)
      })()
    ).rejects.toThrow('route not found')
    expect(chunks).toEqual(['partial'])
    expect(protocols).toEqual(['responses'])
  })

  it('uses Anthropic Messages for the official endpoint in auto mode', async () => {
    mocks.settings.apiBaseURL = 'https://api.anthropic.com/v1'
    const result = await runWithAnswerModel(async (model, protocol) => ({ model, protocol }))

    expect(result.protocol).toBe('anthropic-messages')
    expect(result.model).toMatchObject({ protocol: 'anthropic-messages', model: 'test-model' })
  })

  it('does not append a protocol route twice when a full endpoint is configured', async () => {
    mocks.settings.apiBaseURL = 'https://gateway.example/v1/responses'
    mocks.settings.answerApiProtocol = 'responses'

    await runWithAnswerModel(async () => 'ok')

    expect(mocks.openAIOptions).toContainEqual({
      baseURL: 'https://gateway.example/v1',
      apiKey: 'test-key'
    })
  })
})
