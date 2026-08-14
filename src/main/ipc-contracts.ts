import { z } from 'zod'
import type { AppSettings } from './settings'
import type { AppState } from './state'
import type { AudioSourceRole } from './asr/types'
import { supportedLanguageCodes, transcriptionLanguageCodes } from '../shared/languages'
import { ASR_MODELS } from '../shared/asr-models'
import type { AnswerServiceProfileActivation } from '../shared/answer-service-profile'
import { ANSWER_API_PROTOCOLS } from '../shared/answer-api-protocol'
import { TRAFFIC_LIGHT_MODES } from '../shared/traffic-light-mode'

const appSettingsSchema = z
  .object({
    apiBaseURL: z.string(),
    apiKey: z.string(),
    model: z.string(),
    answerApiProtocol: z.enum(ANSWER_API_PROTOCOLS),
    codeLanguage: z.string(),
    customPrompt: z.string(),
    promptPreset: z.enum(['default', 'concise', 'codeOnly', 'interview']),
    appMode: z.enum(['algorithm', 'general']),
    userMemory: z.string(),
    screenshotAutoSave: z.boolean(),
    screenshotDir: z.string(),
    screenshotDisplayId: z.string(),
    dashscopeApiKey: z.string(),
    asrModel: z.enum(ASR_MODELS),
    interviewCoachEnabled: z.boolean(),
    realtimeAssistEnabled: z.boolean(),
    proactiveAssistEnabled: z.boolean(),
    memoryDistillEnabled: z.boolean(),
    assistDebounceMs: z.number(),
    dualSourceTranscriptionEnabled: z.boolean(),
    speakerDiarizationMode: z.enum(['heuristic', 'provider']),
    transcriptionLanguage: z.enum(transcriptionLanguageCodes),
    translationEnabled: z.boolean(),
    translationTargetLanguage: z.enum(supportedLanguageCodes),
    hideDockIcon: z.boolean(),
    trafficLightMode: z.enum(TRAFFIC_LIGHT_MODES),
    contentProtectionEnabled: z.boolean()
  })
  .partial()
  .strict()

const appStateSchema = z
  .object({
    inCoderPage: z.boolean(),
    ignoreMouse: z.boolean()
  })
  .partial()
  .strict()

// The renderer Shortcut carries extra UI-only fields (defaultKey, category, status);
// validate the fields the main process consumes and strip the rest (no .strict()).
const shortcutConfigSchema = z.object({
  action: z.string().min(1),
  key: z.string().min(1)
})

const shortcutsRecordSchema = z.record(z.string(), shortcutConfigSchema)
const shortcutsArraySchema = z.array(shortcutConfigSchema)
const audioSourceRoleSchema = z.enum(['system', 'microphone'])
const credentialRefSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !['__proto__', 'constructor', 'prototype'].includes(value))
const answerServiceProfileActivationSchema = z
  .object({
    id: z.string().min(1).max(200),
    endpoint: z.string().max(2000),
    credentialRef: credentialRefSchema,
    model: z.string().max(500),
    protocol: z.enum(ANSWER_API_PROTOCOLS)
  })
  .strict()
const answerServiceKeyWriteSchema = z
  .object({
    credentialRef: credentialRefSchema,
    key: z.string().min(1).max(20000)
  })
  .strict()

export function parseAppSettingsPatch(value: unknown): Partial<AppSettings> {
  return appSettingsSchema.parse(value) as Partial<AppSettings>
}

export function parseAppStatePatch(value: unknown): Partial<AppState> {
  return appStateSchema.parse(value) as Partial<AppState>
}

export function parseShortcutsRecord(
  value: unknown
): Record<string, { action: string; key: string }> {
  return shortcutsRecordSchema.parse(value)
}

export function parseShortcutsArray(value: unknown): { action: string; key: string }[] {
  return shortcutsArraySchema.parse(value)
}

export function parseAudioSourceRole(value: unknown): AudioSourceRole {
  return audioSourceRoleSchema.parse(value)
}

export function parseAnswerServiceProfileActivation(
  value: unknown
): AnswerServiceProfileActivation {
  return answerServiceProfileActivationSchema.parse(value)
}

export function parseAnswerServiceCredentialRef(value: unknown): string {
  return credentialRefSchema.parse(value)
}

export function parseAnswerServiceKeyWrite(value: unknown): {
  credentialRef: string
  key: string
} {
  return answerServiceKeyWriteSchema.parse(value)
}

export function parseNonEmptyString(value: unknown): string {
  return z.string().min(1).parse(value)
}

const restoreMessagesSchema = z.array(
  z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string()
  })
)

export function parseRestoreMessages(
  value: unknown
): { role: 'user' | 'assistant'; text: string }[] {
  return restoreMessagesSchema.parse(value)
}
