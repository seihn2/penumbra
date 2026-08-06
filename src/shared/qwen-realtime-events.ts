/** Pure mapping of Qwen-ASR-Realtime server events to our AsrSentenceEvent
   shape. Kept free of IO/WebSocket so it can be unit-tested directly.

   Protocol (DashScope qwen3-asr-flash-realtime, OpenAI-compatible realtime):
   - `conversation.item.input_audio_transcription.text` carries an accumulated
     confirmed prefix `text` plus an unconfirmed draft suffix `stash`; the live
     preview the docs prescribe is `text + stash` → a PARTIAL sentence.
   - `conversation.item.input_audio_transcription.completed` carries the final
     `transcript` → a FINAL sentence.
   Any other event maps to null (caller ignores it). */

export interface QwenAsrSentence {
  text: string
  isPartial: boolean
}

interface QwenRealtimeEvent {
  type?: string
  text?: string
  stash?: string
  transcript?: string
}

export function mapQwenTranscriptionEvent(msg: QwenRealtimeEvent): QwenAsrSentence | null {
  if (msg.type === 'conversation.item.input_audio_transcription.text') {
    const preview = `${msg.text ?? ''}${msg.stash ?? ''}`
    if (!preview) return null
    return { text: preview, isPartial: true }
  }

  if (msg.type === 'conversation.item.input_audio_transcription.completed') {
    const transcript = msg.transcript ?? ''
    if (!transcript) return null
    return { text: transcript, isPartial: false }
  }

  return null
}

/** Extract a human-readable error message from either the top-level `error`
   event or a per-item `.failed` event. Returns null if the event isn't an error. */
export function extractQwenError(msg: {
  type?: string
  error?: { message?: string }
}): string | null {
  if (msg.type === 'error' || msg.type === 'conversation.item.input_audio_transcription.failed') {
    return msg.error?.message || '语音识别失败'
  }
  return null
}
