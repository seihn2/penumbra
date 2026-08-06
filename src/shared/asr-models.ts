/** Real-time ASR models available on DashScope's public endpoint. Verified to
   support WebSocket streaming of raw PCM.

   Two protocol families are supported:
   - 'run-task': DashScope's duplex inference protocol (Qwen-Audio / Fun-ASR / Paraformer).
   - 'realtime': the OpenAI-compatible realtime protocol (Qwen3-ASR-Realtime).
   The provider factory selects an implementation from this classification. */

export type AsrProtocol = 'run-task' | 'realtime'

export const ASR_MODELS = [
  'qwen-audio-3.0-asr-flash-streaming',
  'qwen-audio-3.0-asr-flash-streaming-2026-07-30',
  'qwen3-asr-flash-realtime-2026-02-10',
  'qwen3-asr-flash-realtime',
  'fun-asr-realtime',
  'paraformer-realtime-v2'
] as const

export type AsrModel = (typeof ASR_MODELS)[number]

export const DEFAULT_ASR_MODEL: AsrModel = 'qwen-audio-3.0-asr-flash-streaming'

const QWEN_AUDIO_STREAMING_PREFIX = 'qwen-audio-3.0-asr-flash-streaming'
const QWEN3_REALTIME_PREFIX = 'qwen3-asr-flash-realtime'

/** The wire protocol a given ASR model speaks. Unknown/custom models default to
   the run-task protocol (the historical behavior). */
export function asrProtocolFor(model: string): AsrProtocol {
  return model.startsWith(QWEN3_REALTIME_PREFIX) ? 'realtime' : 'run-task'
}

export function isQwenAudioStreamingModel(model: string): boolean {
  return model.startsWith(QWEN_AUDIO_STREAMING_PREFIX)
}

export function isCompatibilityAsrModel(model: string): boolean {
  return model.startsWith('fun-asr-realtime') || model.startsWith('paraformer-realtime')
}

export function isAsrModel(value: unknown): value is AsrModel {
  return typeof value === 'string' && (ASR_MODELS as readonly string[]).includes(value)
}
