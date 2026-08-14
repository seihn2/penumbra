import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import {
  answerApiProtocolOrder,
  isProtocolRouteError,
  normalizeAnswerApiBaseURL,
  normalizeAnthropicBaseURL,
  sanitizeAnswerApiProtocol,
  type ConcreteAnswerApiProtocol
} from '../shared/answer-api-protocol'
import { recommendedModelFor } from '../shared/model-catalog'
import { settings } from './settings'

interface AnswerModelSnapshot {
  endpoint: string
  apiKey: string
  model: string
  protocols: ConcreteAnswerApiProtocol[]
}

export async function runWithAnswerModel<T>(
  operation: (model: LanguageModel, protocol: ConcreteAnswerApiProtocol) => Promise<T>
): Promise<T> {
  const snapshot = createSnapshot()
  let lastError: unknown

  for (let index = 0; index < snapshot.protocols.length; index += 1) {
    const protocol = snapshot.protocols[index]
    try {
      return await operation(createModel(snapshot, protocol), protocol)
    } catch (error) {
      lastError = error
      if (!shouldTryNextProtocol(error, index, snapshot.protocols.length)) throw error
      console.warn(`[answer-api] ${protocol} route unavailable; trying alternate protocol`)
    }
  }

  throw lastError
}

export function streamWithAnswerModel(
  operation: (model: LanguageModel, protocol: ConcreteAnswerApiProtocol) => AsyncIterable<string>
): AsyncIterable<string> {
  const snapshot = createSnapshot()

  return (async function* () {
    let lastError: unknown

    for (let index = 0; index < snapshot.protocols.length; index += 1) {
      const protocol = snapshot.protocols[index]
      let emitted = false
      try {
        const stream = operation(createModel(snapshot, protocol), protocol)
        for await (const chunk of stream) {
          emitted = true
          yield chunk
        }
        return
      } catch (error) {
        lastError = error
        if (emitted || !shouldTryNextProtocol(error, index, snapshot.protocols.length)) {
          throw error
        }
        console.warn(`[answer-api] ${protocol} route unavailable; trying alternate protocol`)
      }
    }

    throw lastError
  })()
}

function createSnapshot(): AnswerModelSnapshot {
  const endpoint = settings.apiBaseURL
  const configuredProtocol = sanitizeAnswerApiProtocol(settings.answerApiProtocol)
  return {
    endpoint,
    apiKey: settings.apiKey,
    model: settings.model || recommendedModelFor(endpoint)?.id || 'gpt-5.6-luna',
    protocols: answerApiProtocolOrder(configuredProtocol, endpoint)
  }
}

function createModel(
  snapshot: AnswerModelSnapshot,
  protocol: ConcreteAnswerApiProtocol
): LanguageModel {
  const normalizedEndpoint = normalizeAnswerApiBaseURL(snapshot.endpoint)
  if (protocol === 'anthropic-messages') {
    const baseURL = normalizeAnthropicBaseURL(normalizedEndpoint)
    const anthropic = createAnthropic({
      ...(baseURL ? { baseURL } : {}),
      apiKey: snapshot.apiKey
    })
    return anthropic(snapshot.model)
  }

  const openai = createOpenAI({
    ...(normalizedEndpoint ? { baseURL: normalizedEndpoint } : {}),
    apiKey: snapshot.apiKey
  })
  return protocol === 'responses' ? openai.responses(snapshot.model) : openai.chat(snapshot.model)
}

function shouldTryNextProtocol(error: unknown, index: number, protocolCount: number): boolean {
  return index + 1 < protocolCount && isProtocolRouteError(error)
}
