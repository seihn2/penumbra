import { isQwenAudioStreamingModel } from '../../shared/asr-models'

export function buildRunTaskParameters(
  model: string,
  languageHints: readonly string[] = []
): Record<string, unknown> {
  const parameters: Record<string, unknown> = {
    format: 'pcm',
    sample_rate: 16000
  }

  if (isQwenAudioStreamingModel(model)) {
    // The Qwen-Audio 3.0 API no longer documents the legacy cleanup flags.
    // Heartbeats keep long interview pauses from closing the task after 60s.
    parameters.heartbeat = true
  } else {
    // Preserve the established Fun-ASR / Paraformer behavior for existing users.
    parameters.disfluency_removal_enabled = true
    parameters.punctuation_prediction_enabled = true
  }

  const supportedHints = isQwenAudioStreamingModel(model)
    ? languageHints.slice(0, 4)
    : languageHints.length === 1
      ? languageHints
      : []
  if (supportedHints.length > 0) parameters.language_hints = supportedHints

  return parameters
}
