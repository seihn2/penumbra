export const supportedLanguageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' }
] as const

export const transcriptionLanguagePresets = [{ value: 'zh-en', label: '中文 + English' }] as const

export const transcriptionLanguageOptions = [
  { value: 'auto', label: '自动检测' },
  ...transcriptionLanguagePresets,
  ...supportedLanguageOptions
] as const

export const supportedLanguageCodes = supportedLanguageOptions.map((option) => option.value)
export const transcriptionLanguageCodes = transcriptionLanguageOptions.map((option) => option.value)

export type SupportedLanguageCode = (typeof supportedLanguageCodes)[number]
export type TranscriptionLanguageCode = (typeof transcriptionLanguageCodes)[number]

export function isSupportedLanguageCode(value: string): value is SupportedLanguageCode {
  return supportedLanguageCodes.includes(value as SupportedLanguageCode)
}

export function isTranscriptionLanguageCode(value: string): value is TranscriptionLanguageCode {
  return transcriptionLanguageCodes.includes(value as TranscriptionLanguageCode)
}

export function transcriptionLanguageHints(code: string): string[] {
  if (code === 'auto') return []
  if (code === 'zh-en') return ['zh', 'en']
  return isSupportedLanguageCode(code) ? [code] : []
}
