import type { SpeakerRole } from '../../shared/interview-coach'

export interface AsrSentenceEvent {
  text: string
  isPartial: boolean
  providerSpeaker?: SpeakerRole
}

export interface AsrProviderCallbacks {
  onStarted: () => void
  onSentence: (event: AsrSentenceEvent) => void
  onError: (message: string) => void
  onFinished: () => void
}

export type AudioSourceRole = 'system' | 'microphone'

export interface AsrStartOptions {
  apiKey: string
  model: string
  /** ISO language hints. Empty/undefined = auto-detect. */
  languageHints?: string[]
}

export interface AsrProvider {
  start(options: AsrStartOptions, callbacks: AsrProviderCallbacks): void
  stop(): void
  sendAudioChunk(chunk: ArrayBuffer): void
  isRunning(): boolean
}
