export const ANSWER_CONNECTION_PROBE_MAX_OUTPUT_TOKENS = 16

export function createAnswerConnectionProbeRequest(): {
  prompt: string
  maxOutputTokens: number
} {
  return {
    prompt: 'Reply with OK.',
    maxOutputTokens: ANSWER_CONNECTION_PROBE_MAX_OUTPUT_TOKENS
  }
}
