import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { SupportedLanguageCode, TranscriptionLanguageCode } from '../../../../shared/languages'
import type { MotionPreference } from '../../../../shared/motion-preference'
import { DEFAULT_ASR_MODEL } from '../../../../shared/asr-models'
import { clampOpacity, OPACITY_DEFAULTS } from '../../../../shared/opacity'
import { clampFontSize, FONT_SIZE_DEFAULTS } from '../../../../shared/font-size'
import {
  createDefaultAnswerServiceProfile,
  getActiveAnswerServiceProfile,
  removeAnswerServiceProfile as removeProfileFromState,
  sanitizeAnswerServiceProfileState,
  updateAnswerServiceProfile as updateProfileList,
  type AnswerServiceProfile
} from '../../../../shared/answer-service-profile'
import {
  DEFAULT_ANSWER_API_PROTOCOL,
  type AnswerApiProtocol
} from '../../../../shared/answer-api-protocol'
import {
  DEFAULT_CODE_BLOCK_THEME,
  sanitizeCodeBlockTheme,
  type CodeBlockTheme
} from '../../../../shared/code-block-theme'
import {
  DEFAULT_TRAFFIC_LIGHT_MODE,
  sanitizeTrafficLightMode,
  type TrafficLightMode
} from '../../../../shared/traffic-light-mode'
import {
  clampZeroUiBackgroundOpacity,
  DEFAULT_ZERO_UI_BORDER_VISIBLE,
  DEFAULT_ZERO_UI_BACKDROP,
  ZERO_UI_PALETTE_DEFAULTS,
  sanitizeZeroUiBackdrop,
  sanitizeZeroUiColor,
  type ZeroUiBackdrop
} from '../../../../shared/zero-ui-theme'

export type SpeakerDiarizationMode = 'heuristic' | 'provider'

export interface Settings {
  // theme: 'light' | 'dark'an
  apiBaseURL: string
  apiKey: string
  model: string
  answerApiProtocol: AnswerApiProtocol
  answerServiceProfiles: AnswerServiceProfile[]
  activeAnswerServiceProfileId: string
  /** Renderer-visible status only; the raw active key remains in main. */
  answerServiceKeyConfigured: boolean
  /** Prevents the first-run dialog flashing before profile activation finishes. */
  answerServiceReady: boolean
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
  iconOpacity: number
  uiLanguage: string
  uiFontSize: number
  answerFontSize: number
  accentColor: string
  codeBlockTheme: CodeBlockTheme
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
  trafficLightMode: TrafficLightMode
  zeroUiMode: boolean
  zeroUiBackdrop: ZeroUiBackdrop
  zeroUiDarkTextColor: string
  zeroUiDarkBackgroundColor: string
  zeroUiDarkBackgroundOpacity: number
  zeroUiLightTextColor: string
  zeroUiLightBackgroundColor: string
  zeroUiLightBackgroundOpacity: number
  zeroUiBorderVisible: boolean
  contentProtectionEnabled: boolean
  reduceMotion: MotionPreference
}

interface SettingsStore extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  syncSettings: (settings: Partial<Settings>) => void
  addAnswerServiceProfile: (profile: AnswerServiceProfile) => void
  updateAnswerServiceProfile: (
    profileId: string,
    patch: Partial<
      Pick<
        AnswerServiceProfile,
        'name' | 'endpoint' | 'model' | 'protocol' | 'modelCache' | 'lastTest'
      >
    >
  ) => void
  setActiveAnswerServiceProfile: (profileId: string) => void
  removeAnswerServiceProfile: (profileId: string) => void
  setAnswerServiceAvailability: (configured: boolean, ready?: boolean) => void
}

type UpdateSetting = SettingsStore['updateSetting']

type PersistedSettings = Omit<
  Settings,
  'apiKey' | 'dashscopeApiKey' | 'answerServiceKeyConfigured' | 'answerServiceReady'
>

const initialAnswerProfile = createDefaultAnswerServiceProfile()

const defaultSettings: Settings = {
  apiBaseURL: '',
  apiKey: '',
  model: '',
  answerApiProtocol: DEFAULT_ANSWER_API_PROTOCOL,
  answerServiceProfiles: [initialAnswerProfile],
  activeAnswerServiceProfileId: initialAnswerProfile.id,
  answerServiceKeyConfigured: false,
  answerServiceReady: false,
  customModels: [],
  customPrompt: '',
  promptPreset: 'default',
  appMode: 'algorithm',
  userMemory: '',
  memoryProfiles: '',
  codeLanguage: '',

  overallOpacity: OPACITY_DEFAULTS.overall,
  opacity: OPACITY_DEFAULTS.window,
  textOpacity: OPACITY_DEFAULTS.text,
  iconOpacity: OPACITY_DEFAULTS.icon,
  uiLanguage: 'zh',
  uiFontSize: FONT_SIZE_DEFAULTS.ui,
  answerFontSize: FONT_SIZE_DEFAULTS.answer,
  accentColor: '#4aa3df',
  codeBlockTheme: DEFAULT_CODE_BLOCK_THEME,

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
  trafficLightMode: DEFAULT_TRAFFIC_LIGHT_MODE,
  zeroUiMode: false,
  zeroUiBackdrop: DEFAULT_ZERO_UI_BACKDROP,
  zeroUiDarkTextColor: ZERO_UI_PALETTE_DEFAULTS.dark.textColor,
  zeroUiDarkBackgroundColor: ZERO_UI_PALETTE_DEFAULTS.dark.backgroundColor,
  zeroUiDarkBackgroundOpacity: ZERO_UI_PALETTE_DEFAULTS.dark.backgroundOpacity,
  zeroUiLightTextColor: ZERO_UI_PALETTE_DEFAULTS.light.textColor,
  zeroUiLightBackgroundColor: ZERO_UI_PALETTE_DEFAULTS.light.backgroundColor,
  zeroUiLightBackgroundOpacity: ZERO_UI_PALETTE_DEFAULTS.light.backgroundOpacity,
  zeroUiBorderVisible: DEFAULT_ZERO_UI_BORDER_VISIBLE,
  contentProtectionEnabled: true,
  reduceMotion: 'system'
}

function toPersistedSettings(state: SettingsStore): PersistedSettings {
  return {
    apiBaseURL: state.apiBaseURL,
    model: state.model,
    answerApiProtocol: state.answerApiProtocol,
    answerServiceProfiles: state.answerServiceProfiles,
    activeAnswerServiceProfileId: state.activeAnswerServiceProfileId,
    customModels: state.customModels,
    customPrompt: state.customPrompt,
    promptPreset: state.promptPreset,
    appMode: state.appMode,
    userMemory: state.userMemory,
    memoryProfiles: state.memoryProfiles,
    overallOpacity: state.overallOpacity,
    opacity: state.opacity,
    textOpacity: state.textOpacity,
    iconOpacity: state.iconOpacity,
    uiLanguage: state.uiLanguage,
    uiFontSize: state.uiFontSize,
    answerFontSize: state.answerFontSize,
    accentColor: state.accentColor,
    codeBlockTheme: state.codeBlockTheme,
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
    trafficLightMode: state.trafficLightMode,
    zeroUiMode: state.zeroUiMode,
    zeroUiBackdrop: state.zeroUiBackdrop,
    zeroUiDarkTextColor: state.zeroUiDarkTextColor,
    zeroUiDarkBackgroundColor: state.zeroUiDarkBackgroundColor,
    zeroUiDarkBackgroundOpacity: state.zeroUiDarkBackgroundOpacity,
    zeroUiLightTextColor: state.zeroUiLightTextColor,
    zeroUiLightBackgroundColor: state.zeroUiLightBackgroundColor,
    zeroUiLightBackgroundOpacity: state.zeroUiLightBackgroundOpacity,
    zeroUiBorderVisible: state.zeroUiBorderVisible,
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
      },
      addAnswerServiceProfile: (profile) => {
        set((state) => ({
          answerServiceProfiles: [...state.answerServiceProfiles, profile],
          activeAnswerServiceProfileId: profile.id,
          apiBaseURL: profile.endpoint,
          model: profile.model,
          answerApiProtocol: profile.protocol,
          answerServiceKeyConfigured: false
        }))
      },
      updateAnswerServiceProfile: (profileId, patch) => {
        set((state) => {
          const answerServiceProfiles = updateProfileList(
            state.answerServiceProfiles,
            profileId,
            patch
          )
          const active = getActiveAnswerServiceProfile({
            profiles: answerServiceProfiles,
            activeProfileId: state.activeAnswerServiceProfileId
          })
          return {
            answerServiceProfiles,
            ...(profileId === state.activeAnswerServiceProfileId
              ? {
                  apiBaseURL: active.endpoint,
                  model: active.model,
                  answerApiProtocol: active.protocol
                }
              : {})
          }
        })
      },
      setActiveAnswerServiceProfile: (profileId) => {
        set((state) => {
          const active = state.answerServiceProfiles.find((profile) => profile.id === profileId)
          if (!active) return state
          return {
            activeAnswerServiceProfileId: active.id,
            apiBaseURL: active.endpoint,
            model: active.model,
            answerApiProtocol: active.protocol,
            answerServiceKeyConfigured: false
          }
        })
      },
      removeAnswerServiceProfile: (profileId) => {
        set((state) => {
          const next = removeProfileFromState(
            {
              profiles: state.answerServiceProfiles,
              activeProfileId: state.activeAnswerServiceProfileId
            },
            profileId
          )
          const active = getActiveAnswerServiceProfile(next)
          return {
            answerServiceProfiles: next.profiles,
            activeAnswerServiceProfileId: next.activeProfileId,
            apiBaseURL: active.endpoint,
            model: active.model,
            answerApiProtocol: active.protocol,
            answerServiceKeyConfigured: false
          }
        })
      },
      setAnswerServiceAvailability: (configured, ready = true) => {
        set({ answerServiceKeyConfigured: configured, answerServiceReady: ready })
      }
    }),
    {
      name: 'interview-coder-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: toPersistedSettings,
      version: 22,
      migrate: migratePersistedSettings
    }
  )
)

export function migratePersistedSettings(persistedState: unknown, fromVersion: number): Settings {
  const legacyHideTrafficLights =
    persistedState !== null &&
    typeof persistedState === 'object' &&
    (persistedState as { hideTrafficLights?: unknown }).hideTrafficLights === true
  const sanitized = sanitizePersistedSettings(persistedState)
  // v15: screen-capture stealth (contentProtectionEnabled) was briefly
  // defaulted OFF while debugging a macOS invisible-window issue, which
  // silently disabled the app's core "invisible to screen share" feature.
  // Force it back ON for anyone upgrading from an older persisted state.
  if (fromVersion < 15) {
    sanitized.contentProtectionEnabled = true
  }
  if (fromVersion < 16) {
    sanitized.iconOpacity = OPACITY_DEFAULTS.icon
  }
  if (fromVersion < 17) {
    sanitized.uiFontSize = FONT_SIZE_DEFAULTS.ui
  }
  if (fromVersion < 18) {
    const profileState = sanitizeAnswerServiceProfileState(undefined, undefined, {
      endpoint: sanitized.apiBaseURL,
      model: sanitized.model
    })
    sanitized.answerServiceProfiles = profileState.profiles
    sanitized.activeAnswerServiceProfileId = profileState.activeProfileId
  }
  if (fromVersion < 19) {
    const activeProfile = getActiveAnswerServiceProfile({
      profiles: sanitized.answerServiceProfiles,
      activeProfileId: sanitized.activeAnswerServiceProfileId
    })
    sanitized.answerApiProtocol = activeProfile.protocol
  }
  if (fromVersion < 20) {
    sanitized.codeBlockTheme = DEFAULT_CODE_BLOCK_THEME
    sanitized.trafficLightMode = legacyHideTrafficLights ? 'hidden' : DEFAULT_TRAFFIC_LIGHT_MODE
  }
  if (fromVersion < 22) {
    sanitized.zeroUiDarkTextColor = ZERO_UI_PALETTE_DEFAULTS.dark.textColor
    sanitized.zeroUiDarkBackgroundColor = ZERO_UI_PALETTE_DEFAULTS.dark.backgroundColor
    sanitized.zeroUiDarkBackgroundOpacity = ZERO_UI_PALETTE_DEFAULTS.dark.backgroundOpacity
    sanitized.zeroUiLightTextColor = ZERO_UI_PALETTE_DEFAULTS.light.textColor
    sanitized.zeroUiLightBackgroundColor = ZERO_UI_PALETTE_DEFAULTS.light.backgroundColor
    sanitized.zeroUiLightBackgroundOpacity = ZERO_UI_PALETTE_DEFAULTS.light.backgroundOpacity
    sanitized.zeroUiBorderVisible = DEFAULT_ZERO_UI_BORDER_VISIBLE
  }
  return sanitized
}

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
    const sanitized = { ...defaultSettings, ...cleaned } as Settings
    const raw = persistedState as Partial<Settings>
    const profileState = sanitizeAnswerServiceProfileState(
      raw.answerServiceProfiles,
      raw.activeAnswerServiceProfileId,
      {
        endpoint: typeof raw.apiBaseURL === 'string' ? raw.apiBaseURL : '',
        model: typeof raw.model === 'string' ? raw.model : '',
        protocol: raw.answerApiProtocol
      }
    )
    const activeProfile = getActiveAnswerServiceProfile(profileState)
    sanitized.answerServiceProfiles = profileState.profiles
    sanitized.activeAnswerServiceProfileId = profileState.activeProfileId
    sanitized.apiBaseURL = activeProfile.endpoint
    sanitized.model = activeProfile.model
    sanitized.answerApiProtocol = activeProfile.protocol
    sanitized.answerServiceKeyConfigured = false
    sanitized.answerServiceReady = false
    sanitized.overallOpacity = clampOpacity('overall', sanitized.overallOpacity)
    sanitized.opacity = clampOpacity('window', sanitized.opacity)
    sanitized.textOpacity = clampOpacity('text', sanitized.textOpacity)
    sanitized.iconOpacity = clampOpacity('icon', sanitized.iconOpacity)
    sanitized.uiFontSize = clampFontSize('ui', sanitized.uiFontSize)
    sanitized.answerFontSize = clampFontSize('answer', sanitized.answerFontSize)
    sanitized.codeBlockTheme = sanitizeCodeBlockTheme(sanitized.codeBlockTheme)
    sanitized.trafficLightMode = sanitizeTrafficLightMode(sanitized.trafficLightMode)
    sanitized.zeroUiBackdrop = sanitizeZeroUiBackdrop(sanitized.zeroUiBackdrop)
    sanitized.zeroUiDarkTextColor = sanitizeZeroUiColor(
      sanitized.zeroUiDarkTextColor,
      ZERO_UI_PALETTE_DEFAULTS.dark.textColor
    )
    sanitized.zeroUiDarkBackgroundColor = sanitizeZeroUiColor(
      sanitized.zeroUiDarkBackgroundColor,
      ZERO_UI_PALETTE_DEFAULTS.dark.backgroundColor
    )
    sanitized.zeroUiDarkBackgroundOpacity = clampZeroUiBackgroundOpacity(
      sanitized.zeroUiDarkBackgroundOpacity,
      ZERO_UI_PALETTE_DEFAULTS.dark.backgroundOpacity
    )
    sanitized.zeroUiLightTextColor = sanitizeZeroUiColor(
      sanitized.zeroUiLightTextColor,
      ZERO_UI_PALETTE_DEFAULTS.light.textColor
    )
    sanitized.zeroUiLightBackgroundColor = sanitizeZeroUiColor(
      sanitized.zeroUiLightBackgroundColor,
      ZERO_UI_PALETTE_DEFAULTS.light.backgroundColor
    )
    sanitized.zeroUiLightBackgroundOpacity = clampZeroUiBackgroundOpacity(
      sanitized.zeroUiLightBackgroundOpacity,
      ZERO_UI_PALETTE_DEFAULTS.light.backgroundOpacity
    )
    return sanitized
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
      answerApiProtocol: state.answerApiProtocol,
      answerServiceProfiles: state.answerServiceProfiles,
      activeAnswerServiceProfileId: state.activeAnswerServiceProfileId,
      answerServiceKeyConfigured: state.answerServiceKeyConfigured,
      answerServiceReady: state.answerServiceReady,
      addAnswerServiceProfile: state.addAnswerServiceProfile,
      updateAnswerServiceProfile: state.updateAnswerServiceProfile,
      setActiveAnswerServiceProfile: state.setActiveAnswerServiceProfile,
      removeAnswerServiceProfile: state.removeAnswerServiceProfile,
      setAnswerServiceAvailability: state.setAnswerServiceAvailability,
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
      iconOpacity: state.iconOpacity,
      uiLanguage: state.uiLanguage,
      uiFontSize: state.uiFontSize,
      answerFontSize: state.answerFontSize,
      accentColor: state.accentColor,
      codeBlockTheme: state.codeBlockTheme,
      reduceMotion: state.reduceMotion,
      trafficLightMode: state.trafficLightMode,
      zeroUiMode: state.zeroUiMode,
      zeroUiBackdrop: state.zeroUiBackdrop,
      zeroUiDarkTextColor: state.zeroUiDarkTextColor,
      zeroUiDarkBackgroundColor: state.zeroUiDarkBackgroundColor,
      zeroUiDarkBackgroundOpacity: state.zeroUiDarkBackgroundOpacity,
      zeroUiLightTextColor: state.zeroUiLightTextColor,
      zeroUiLightBackgroundColor: state.zeroUiLightBackgroundColor,
      zeroUiLightBackgroundOpacity: state.zeroUiLightBackgroundOpacity,
      zeroUiBorderVisible: state.zeroUiBorderVisible,
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
      answerServiceProfiles: state.answerServiceProfiles,
      activeAnswerServiceProfileId: state.activeAnswerServiceProfileId,
      answerServiceKeyConfigured: state.answerServiceKeyConfigured,
      answerServiceReady: state.answerServiceReady,
      updateAnswerServiceProfile: state.updateAnswerServiceProfile,
      setAnswerServiceAvailability: state.setAnswerServiceAvailability
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
