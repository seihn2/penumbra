export function buildQwenRealtimeSession(
  languageHints: readonly string[] = []
): Record<string, unknown> {
  const session: Record<string, unknown> = {
    input_audio_format: 'pcm',
    sample_rate: 16000,
    turn_detection: { type: 'server_vad', threshold: 0.0, silence_duration_ms: 400 }
  }

  // Qwen3-ASR-Realtime accepts one explicit language. Mixed-language presets
  // intentionally fall back to the model's automatic detection.
  if (languageHints.length === 1) {
    session.input_audio_transcription = { language: languageHints[0] }
  }

  return session
}
