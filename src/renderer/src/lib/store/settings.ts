import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { SupportedLanguageCode, TranscriptionLanguageCode } from '../../../../shared/languages'
import type { MotionPreference } from '../../../../shared/motion-preference'
import { DEFAULT_ASR_MODEL } from '../../../../shared/asr-models'

export type SpeakerDiarizationMode = 'heuristic' | 'provider'

export interface Settings {
  // theme: 'light' | 'dark'an
  apiBaseURL: string
  apiKey: string
  model: string
  customModels: string[]
  customPrompt: string
  promptPreset: string
  appMode: string
  userMemory: string
  // JSON-serialized MemoryState (structured profiles + active id). The compiled
  // text of the active profile is mirrored into `userMemory`, which is the only
  // memory field the main process / AI prompt reads — so main stays unchanged.
  memoryProfiles: string

  overallOpacity: number
  opacity: number
  textOpacity: number
  uiLanguage: string
  answerFontSize: number
  accentColor: string
  codeLanguage: string

  screenshotAutoSave: boolean
  screenshotDir: string
  screenshotDisplayId: string

  dashscopeApiKey: string
  asrModel: string
  microphoneDeviceId: string
  interviewCoachEnabled: boolean
  realtimeAssistEnabled: boolean
  proactiveAssistEnabled: boolean
  memoryDistillEnabled: boolean
  assistDebounceMs: number
  dualSourceTranscriptionEnabled: boolean
  speakerDiarizationMode: SpeakerDiarizationMode
  transcriptionLanguage: TranscriptionLanguageCode
  translationEnabled: boolean
  translationTargetLanguage: SupportedLanguageCode

  hideDockIcon: boolean
  contentProtectionEnabled: boolean
  reduceMotion: MotionPreference
}

interface SettingsStore extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  syncSettings: (settings: Partial<Settings>) => void
}

type UpdateSetting = SettingsStore['updateSetting']

type PersistedSettings = Omit<Settings, 'apiKey' | 'dashscopeApiKey'>

const defaultSettings: Settings = {
  apiBaseURL: '',
  apiKey: '',
  model: '',
  customModels: [],
  customPrompt: '',
  promptPreset: 'default',
  appMode: 'algorithm',
  userMemory: '',
  memoryProfiles: '',
  codeLanguage: '',

  overallOpacity: 1,
  opacity: 0.8,
  textOpacity: 1,
  uiLanguage: 'zh',
  answerFontSize: 14,
  accentColor: '#4aa3df',

  screenshotAutoSave: false,
  screenshotDir: '',
  screenshotDisplayId: '',

  dashscopeApiKey: '',
  asrModel: DEFAULT_ASR_MODEL,
  microphoneDeviceId: '',
  interviewCoachEnabled: true,
  realtimeAssistEnabled: false,
  proactiveAssistEnabled: false,
  memoryDistillEnabled: false,
  assistDebounceMs: 1500,
  dualSourceTranscriptionEnabled: false,
  speakerDiarizationMode: 'heuristic',
  transcriptionLanguage: 'auto',
  translationEnabled: false,
  translationTargetLanguage: 'zh',

  hideDockIcon: false,
  contentProtectionEnabled: true,
  reduceMotion: 'system'
}

function toPersistedSettings(state: SettingsStore): PersistedSettings {
  return {
    apiBaseURL: state.apiBaseURL,
    model: state.model,
    customModels: state.customModels,
    customPrompt: state.customPrompt,
    promptPreset: state.promptPreset,
    appMode: state.appMode,
    userMemory: state.userMemory,
    memoryProfiles: state.memoryProfiles,
    overallOpacity: state.overallOpacity,
    opacity: state.opacity,
    textOpacity: state.textOpacity,
    uiLanguage: state.uiLanguage,
    answerFontSize: state.answerFontSize,
    accentColor: state.accentColor,
    codeLanguage: state.codeLanguage,
    screenshotAutoSave: state.screenshotAutoSave,
    screenshotDir: state.screenshotDir,
    screenshotDisplayId: state.screenshotDisplayId,
    asrModel: state.asrModel,
    microphoneDeviceId: state.microphoneDeviceId,
    interviewCoachEnabled: state.interviewCoachEnabled,
    realtimeAssistEnabled: state.realtimeAssistEnabled,
    proactiveAssistEnabled: state.proactiveAssistEnabled,
    memoryDistillEnabled: state.memoryDistillEnabled,
    assistDebounceMs: state.assistDebounceMs,
    dualSourceTranscriptionEnabled: state.dualSourceTranscriptionEnabled,
    speakerDiarizationMode: state.speakerDiarizationMode,
    transcriptionLanguage: state.transcriptionLanguage,
    translationEnabled: state.translationEnabled,
    translationTargetLanguage: state.translationTargetLanguage,
    hideDockIcon: state.hideDockIcon,
    contentProtectionEnabled: state.contentProtectionEnabled,
    reduceMotion: state.reduceMotion
  }
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSetting: (key, value) => {
        set({ [key]: value })
      },
      syncSettings: (settings) => {
        set(settings)
      }
    }),
    {
      name: 'interview-coder-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: toPersistedSettings,
      version: 15,
      migrate: (persistedState, fromVersion) => {
        const sanitized = sanitizePersistedSettings(persistedState)
        // v15: screen-capture stealth (contentProtectionEnabled) was briefly
        // defaulted OFF while debugging a macOS invisible-window issue, which
        // silently disabled the app's core "invisible to screen share" feature.
        // Force it back ON for anyone upgrading from an older persisted state.
        if (fromVersion < 15) {
          sanitized.contentProtectionEnabled = true
        }
        return sanitized
      }
    }
  )
)

/** Sanitize persisted settings: keep only known keys whose value type matches
   the default, merged over defaults. Never throws — corrupt state can't crash
   the renderer (which, on a transparent window, would make the app invisible). */
export function sanitizePersistedSettings(persistedState: unknown): Settings {
  try {
    if (!persistedState || typeof persistedState !== 'object') {
      return { ...defaultSettings }
    }
    const cleaned: Record<string, unknown> = {}
    const defaults = defaultSettings as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(persistedState)) {
      const def = defaults[key]
      if (def === undefined) continue // unknown key, ignore
      if (Array.isArray(def)) {
        if (Array.isArray(value)) cleaned[key] = value
      } else if (typeof value === typeof def) {
        cleaned[key] = value
      }
    }
    return { ...defaultSettings, ...cleaned } as Settings
  } catch {
    return { ...defaultSettings }
  }
}

export const useSettingValue = <K extends keyof Settings>(key: K): Settings[K] =>
  useSettingsStore((state) => state[key])

export const useUpdateSetting = (): UpdateSetting =>
  useSettingsStore((state) => state.updateSetting)

export const useModelSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      apiBaseURL: state.apiBaseURL,
      apiKey: state.apiKey,
      model: state.model,
      updateSetting: state.updateSetting
    }))
  )

export const useVoiceSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      dashscopeApiKey: state.dashscopeApiKey,
      asrModel: state.asrModel,
      microphoneDeviceId: state.microphoneDeviceId,
      interviewCoachEnabled: state.interviewCoachEnabled,
      realtimeAssistEnabled: state.realtimeAssistEnabled,
      proactiveAssistEnabled: state.proactiveAssistEnabled,
      memoryDistillEnabled: state.memoryDistillEnabled,
      assistDebounceMs: state.assistDebounceMs,
      dualSourceTranscriptionEnabled: state.dualSourceTranscriptionEnabled,
      speakerDiarizationMode: state.speakerDiarizationMode,
      transcriptionLanguage: state.transcriptionLanguage,
      updateSetting: state.updateSetting
    }))
  )

export const useStrategySettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      codeLanguage: state.codeLanguage,
      customPrompt: state.customPrompt,
      promptPreset: state.promptPreset,
      appMode: state.appMode,
      translationEnabled: state.translationEnabled,
      translationTargetLanguage: state.translationTargetLanguage,
      updateSetting: state.updateSetting
    }))
  )

export const useMemorySettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      userMemory: state.userMemory,
      memoryProfiles: state.memoryProfiles,
      updateSetting: state.updateSetting
    }))
  )

export const useAppearanceSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      overallOpacity: state.overallOpacity,
      opacity: state.opacity,
      textOpacity: state.textOpacity,
      uiLanguage: state.uiLanguage,
      answerFontSize: state.answerFontSize,
      accentColor: state.accentColor,
      reduceMotion: state.reduceMotion,
      updateSetting: state.updateSetting
    }))
  )

export const useStorageSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      screenshotAutoSave: state.screenshotAutoSave,
      screenshotDir: state.screenshotDir,
      screenshotDisplayId: state.screenshotDisplayId,
      updateSetting: state.updateSetting
    }))
  )

export const usePrivacySettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      hideDockIcon: state.hideDockIcon,
      contentProtectionEnabled: state.contentProtectionEnabled,
      updateSetting: state.updateSetting
    }))
  )

export const usePrerequisiteSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      apiKey: state.apiKey,
      apiBaseURL: state.apiBaseURL,
      updateSetting: state.updateSetting
    }))
  )

export const useTranscriptionSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      dashscopeApiKey: state.dashscopeApiKey,
      dualSourceTranscriptionEnabled: state.dualSourceTranscriptionEnabled,
      microphoneDeviceId: state.microphoneDeviceId
    }))
  )
