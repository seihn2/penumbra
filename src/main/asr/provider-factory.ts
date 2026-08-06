import type { AsrProvider } from './types'
import { DashScopeAsrProvider } from './dashscope-provider'
import { QwenRealtimeAsrProvider } from './qwen-realtime-provider'
import { asrProtocolFor } from '../../shared/asr-models'

/** Build the ASR provider whose wire protocol matches the configured model.
   The transcription pipeline is protocol-agnostic (it only sees AsrProvider),
   so switching the model in settings swaps the implementation transparently. */
export function createAsrProvider(model: string): AsrProvider {
  return asrProtocolFor(model) === 'realtime'
    ? new QwenRealtimeAsrProvider()
    : new DashScopeAsrProvider()
}
