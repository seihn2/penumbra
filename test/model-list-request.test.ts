import { describe, expect, it } from 'vitest'
import { createModelListRequest } from '../src/shared/model-list-request'

describe('model list request', () => {
  it('uses bearer auth for OpenAI-compatible protocols', () => {
    expect(createModelListRequest('https://api.openai.com/v1/', 'key', 'responses')).toEqual({
      url: 'https://api.openai.com/v1/models',
      headers: { Authorization: 'Bearer key' }
    })
  })

  it('builds the models route from a full Responses endpoint', () => {
    expect(
      createModelListRequest('https://gateway.example/v1/responses', 'key', 'responses')
    ).toEqual({
      url: 'https://gateway.example/v1/models',
      headers: { Authorization: 'Bearer key' }
    })
  })

  it('uses Anthropic headers and normalizes the official base URL', () => {
    expect(createModelListRequest('https://api.anthropic.com', 'key', 'auto')).toEqual({
      url: 'https://api.anthropic.com/v1/models',
      headers: {
        'x-api-key': 'key',
        'anthropic-version': '2023-06-01'
      }
    })
  })

  it('supports an explicitly selected Anthropic-compatible gateway', () => {
    expect(
      createModelListRequest('https://gateway.example/claude/v1', 'key', 'anthropic-messages')
    ).toMatchObject({
      url: 'https://gateway.example/claude/v1/models',
      headers: { 'x-api-key': 'key' }
    })
  })
})
