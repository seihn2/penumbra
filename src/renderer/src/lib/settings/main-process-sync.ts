import type { Settings } from '@/lib/store/settings'
import { getCloneableFields } from '@/lib/utils'

const mainProcessSettingKeys: (keyof Settings)[] = [
  'apiBaseURL',
  'model',
  'answerApiProtocol',
  'customPrompt',
  'promptPreset',
  'appMode',
  'userMemory',
  'codeLanguage',
  'screenshotAutoSave',
  'screenshotDir',
  'screenshotDisplayId',
  'dashscopeApiKey',
  'asrModel',
  'interviewCoachEnabled',
  'realtimeAssistEnabled',
  'proactiveAssistEnabled',
  'memoryDistillEnabled',
  'assistDebounceMs',
  'dualSourceTranscriptionEnabled',
  'speakerDiarizationMode',
  'transcriptionLanguage',
  'translationEnabled',
  'translationTargetLanguage',
  'hideDockIcon',
  'trafficLightMode',
  'zeroUiMode',
  'contentProtectionEnabled'
]

export function pickMainProcessSettings(settings: object): Partial<Settings> {
  const cloneableSettings = getCloneableFields(settings) as Partial<
    Record<keyof Settings, Settings[keyof Settings]>
  >
  const pickedSettings = {} as Partial<Record<keyof Settings, Settings[keyof Settings]>>

  for (const key of mainProcessSettingKeys) {
    const value = cloneableSettings[key]
    if (value === undefined) continue
    // Secrets are not persisted in the renderer store and are never hydrated
    // back into it, so the renderer copy is always empty. Skip empty secrets so
    // this write-back doesn't overwrite the encrypted value already on disk in
    // the main process (which would silently wipe the saved key on restart).
    if (key === 'dashscopeApiKey' && value === '') continue
    pickedSettings[key] = value
  }

  return pickedSettings as Partial<Settings>
}

export function getMainProcessHydrationPatch(
  mainSettings: Partial<Record<keyof Settings, Settings[keyof Settings]>>,
  rendererSettings: Partial<Record<keyof Settings, Settings[keyof Settings]>>
): Partial<Settings> {
  const patch = {} as Partial<Record<keyof Settings, Settings[keyof Settings]>>

  for (const key of mainProcessSettingKeys) {
    const mainValue = mainSettings[key]
    const rendererValue = rendererSettings[key]

    if (mainValue && !rendererValue) {
      patch[key] = mainValue
    }
  }

  return patch as Partial<Settings>
}
