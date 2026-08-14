import { describe, expect, it } from 'vitest'
import {
  ANSWER_CONNECTION_PROBE_MAX_OUTPUT_TOKENS,
  createAnswerConnectionProbeRequest
} from '../src/shared/answer-connection-probe'

describe('answer connection probe', () => {
  it('uses the minimum output budget accepted by Responses API gateways', () => {
    expect(ANSWER_CONNECTION_PROBE_MAX_OUTPUT_TOKENS).toBe(16)
    expect(createAnswerConnectionProbeRequest()).toEqual({
      prompt: 'Reply with OK.',
      maxOutputTokens: 16
    })
  })
})
