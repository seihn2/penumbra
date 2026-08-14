import {
  answerApiProtocolOrder,
  normalizeAnswerApiBaseURL,
  normalizeAnthropicBaseURL,
  sanitizeAnswerApiProtocol,
  type AnswerApiProtocol
} from './answer-api-protocol'

export interface ModelListRequest {
  url: string
  headers: Record<string, string>
}

export function createModelListRequest(
  endpoint: string,
  apiKey: string,
  configuredProtocol: AnswerApiProtocol
): ModelListRequest {
  const normalizedEndpoint = normalizeAnswerApiBaseURL(endpoint)
  const protocol = answerApiProtocolOrder(
    sanitizeAnswerApiProtocol(configuredProtocol),
    endpoint
  )[0]

  if (protocol === 'anthropic-messages') {
    const baseURL = normalizeAnthropicBaseURL(normalizedEndpoint) ?? 'https://api.anthropic.com/v1'
    return {
      url: `${baseURL.replace(/\/+$/, '')}/models`,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    }
  }

  const baseURL = (normalizedEndpoint || 'https://api.openai.com/v1').replace(/\/+$/, '')
  return {
    url: `${baseURL}/models`,
    headers: { Authorization: `Bearer ${apiKey}` }
  }
}
