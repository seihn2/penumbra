import { describe, expect, it } from 'vitest'
import {
  answerApiProtocolOrder,
  isProtocolRouteError,
  normalizeAnswerApiBaseURL,
  normalizeAnthropicBaseURL,
  sanitizeAnswerApiProtocol
} from '../src/shared/answer-api-protocol'

describe('answer API protocol', () => {
  it('prefers Responses for OpenAI and Chat Completions for compatible providers', () => {
    expect(answerApiProtocolOrder('auto', 'https://api.openai.com/v1')).toEqual([
      'responses',
      'chat-completions'
    ])
    expect(answerApiProtocolOrder('auto', 'https://api.siliconflow.cn/v1')).toEqual([
      'chat-completions',
      'responses'
    ])
    expect(answerApiProtocolOrder('auto', 'https://api.anthropic.com/v1')).toEqual([
      'anthropic-messages'
    ])
    expect(answerApiProtocolOrder('auto', 'https://gateway.example/v1/responses')).toEqual([
      'responses',
      'chat-completions'
    ])
  })

  it('honors an explicit protocol without fallback candidates', () => {
    expect(answerApiProtocolOrder('responses', 'https://example.com/v1')).toEqual(['responses'])
    expect(answerApiProtocolOrder('chat-completions', '')).toEqual(['chat-completions'])
    expect(answerApiProtocolOrder('anthropic-messages', 'https://gateway.example/v1')).toEqual([
      'anthropic-messages'
    ])
  })

  it('sanitizes unknown persisted values to auto', () => {
    expect(sanitizeAnswerApiProtocol('responses')).toBe('responses')
    expect(sanitizeAnswerApiProtocol('anthropic-messages')).toBe('anthropic-messages')
    expect(sanitizeAnswerApiProtocol('legacy')).toBe('auto')
  })

  it('normalizes only the official Anthropic base URL', () => {
    expect(normalizeAnthropicBaseURL('https://api.anthropic.com')).toBe(
      'https://api.anthropic.com/v1'
    )
    expect(normalizeAnthropicBaseURL('https://gateway.example/anthropic')).toBe(
      'https://gateway.example/anthropic'
    )
  })

  it('accepts full protocol routes as service endpoints', () => {
    expect(normalizeAnswerApiBaseURL('https://gateway.example/v1/responses')).toBe(
      'https://gateway.example/v1'
    )
    expect(normalizeAnswerApiBaseURL('https://gateway.example/v1/chat/completions/')).toBe(
      'https://gateway.example/v1'
    )
    expect(normalizeAnswerApiBaseURL('https://gateway.example/v1/messages?beta=true')).toBe(
      'https://gateway.example/v1'
    )
  })

  it('only treats route/protocol failures as fallback candidates', () => {
    expect(isProtocolRouteError(Object.assign(new Error('not found'), { statusCode: 404 }))).toBe(
      true
    )
    expect(
      isProtocolRouteError(
        Object.assign(new Error('Responses API is not supported'), { statusCode: 400 })
      )
    ).toBe(true)
    expect(
      isProtocolRouteError(Object.assign(new Error('unauthorized'), { statusCode: 401 }))
    ).toBe(false)
    expect(isProtocolRouteError(Object.assign(new Error('bad prompt'), { statusCode: 400 }))).toBe(
      false
    )
  })
})
