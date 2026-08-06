import { useEffect, useState } from 'react'
import { Mic, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useVoiceSettings } from '@/lib/store/settings'
import { listAudioInputDevices } from '@/lib/audio-capture'
import { isTranscriptionLanguageCode } from '../../../shared/languages'
import {
  ASR_MODELS,
  DEFAULT_ASR_MODEL,
  isAsrModel,
  isCompatibilityAsrModel
} from '../../../shared/asr-models'
import { friendlyConnectionError } from './connection-error'
import { LanguageOptions, SecretInput, SettingRow, SettingsSection } from './components'

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

export function VoiceSettingsSection() {
  const { t } = useTranslation()
  const {
    dashscopeApiKey,
    asrModel,
    microphoneDeviceId,
    interviewCoachEnabled,
    realtimeAssistEnabled,
    proactiveAssistEnabled,
    memoryDistillEnabled,
    assistDebounceMs,
    dualSourceTranscriptionEnabled,
    transcriptionLanguage,
    updateSetting
  } = useVoiceSettings()
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])

  const refreshDevices = async () => {
    try {
      setAudioInputs(await listAudioInputDevices())
    } catch {
      // enumeration can fail without permission; leave the list empty
    }
  }

  useEffect(() => {
    refreshDevices()
  }, [])

  const testConnection = async () => {
    if (!dashscopeApiKey.trim() || testStatus === 'testing') return
    setTestStatus('testing')
    // Front-end safety net: if the IPC never resolves (e.g. a stale main
    // process with no handler), don't spin forever — fail after 15s.
    const timeout = new Promise<{ ok: false; error: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), 15000)
    )
    try {
      const result = await Promise.race([
        window.api.testTranscriptionConnection(dashscopeApiKey, asrModel),
        timeout
      ])
      if (result.ok) {
        setTestStatus('ok')
        toast.success(t('settings.voice.testOk'))
      } else {
        setTestStatus('fail')
        toast.error(
          t('settings.voice.testFail', { error: friendlyConnectionError(t, result.error) })
        )
      }
    } catch {
      setTestStatus('fail')
      toast.error(t('settings.voice.testFail', { error: friendlyConnectionError(t, 'unknown') }))
    }
  }

  return (
    <SettingsSection
      icon={Mic}
      title={t('settings.voice.title')}
      description={t('settings.voice.desc')}
    >
      <SettingRow
        title={t('settings.voice.coachEnabled')}
        description={t('settings.voice.coachEnabledDesc')}
      >
        <Switch
          checked={interviewCoachEnabled}
          onCheckedChange={(checked) => updateSetting('interviewCoachEnabled', checked)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.voice.realtimeAssist')}
        description={t('settings.voice.realtimeAssistDesc')}
      >
        <Switch
          checked={realtimeAssistEnabled}
          onCheckedChange={(checked) => updateSetting('realtimeAssistEnabled', checked)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.voice.proactiveAssist')}
        description={t('settings.voice.proactiveAssistDesc')}
      >
        <Switch
          checked={proactiveAssistEnabled}
          onCheckedChange={(checked) => updateSetting('proactiveAssistEnabled', checked)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.voice.memoryDistill')}
        description={t('settings.voice.memoryDistillDesc')}
      >
        <Switch
          checked={memoryDistillEnabled}
          onCheckedChange={(checked) => updateSetting('memoryDistillEnabled', checked)}
        />
      </SettingRow>
      {realtimeAssistEnabled && (
        <SettingRow
          title={t('settings.voice.assistDebounce')}
          description={t('settings.voice.assistDebounceDesc')}
        >
          <div className="flex w-64 items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <Slider
              min={500}
              max={4000}
              step={250}
              value={[assistDebounceMs]}
              onValueChange={(value) => updateSetting('assistDebounceMs', value[0])}
            />
            <span className="w-12 text-right tabular-nums">
              {(assistDebounceMs / 1000).toFixed(1)}s
            </span>
          </div>
        </SettingRow>
      )}
      <SettingRow
        title={t('settings.voice.dualSource')}
        description={t('settings.voice.dualSourceDesc')}
      >
        <Switch
          checked={dualSourceTranscriptionEnabled}
          onCheckedChange={(checked) => updateSetting('dualSourceTranscriptionEnabled', checked)}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.voice.transcriptionLang')}
        description={t('settings.voice.transcriptionLangDesc')}
      >
        <select
          className="settings-select"
          value={transcriptionLanguage}
          onChange={(event) => {
            if (isTranscriptionLanguageCode(event.target.value)) {
              updateSetting('transcriptionLanguage', event.target.value)
            }
          }}
        >
          <option value="auto">{t('settings.voice.autoDetect')}</option>
          <option value="zh-en">{t('settings.voice.bilingualZhEn')}</option>
          <LanguageOptions />
        </select>
      </SettingRow>
      <SettingRow
        title={t('settings.voice.micDevice')}
        description={t('settings.voice.micDeviceDesc')}
      >
        <div className="flex items-center gap-2">
          <select
            className="settings-select"
            value={microphoneDeviceId}
            onChange={(event) => updateSetting('microphoneDeviceId', event.target.value)}
          >
            <option value="">{t('settings.voice.micDeviceDefault')}</option>
            {audioInputs.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || device.deviceId.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refreshDevices}
            title={t('settings.voice.micDeviceRefresh')}
            aria-label={t('settings.voice.micDeviceRefresh')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.voice.dashscopeKey')}
        description={t('settings.voice.dashscopeKeyDesc')}
      >
        <SecretInput
          value={dashscopeApiKey}
          onChange={(value) => {
            updateSetting('dashscopeApiKey', value)
            setTestStatus('idle')
          }}
          placeholder={t('settings.voice.dashscopeKeyPlaceholder')}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.voice.asrModel')}
        description={t('settings.voice.asrModelDesc')}
      >
        <div className="flex w-full flex-col gap-1.5">
          <select
            className="settings-select"
            value={asrModel}
            onChange={(event) => {
              if (isAsrModel(event.target.value)) {
                updateSetting('asrModel', event.target.value)
                setTestStatus('idle')
              }
            }}
          >
            {ASR_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
                {model === DEFAULT_ASR_MODEL ? ` · ${t('settings.voice.asrModelDefault')}` : ''}
              </option>
            ))}
          </select>
          {isCompatibilityAsrModel(asrModel) && (
            <p className="text-[11px] leading-snug text-[var(--accent)]">
              {t('settings.voice.asrModelWarn')}
            </p>
          )}
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.voice.testConnection')}
        description={t('settings.voice.testConnectionDesc')}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!dashscopeApiKey.trim() || testStatus === 'testing'}
          onClick={testConnection}
        >
          {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
          {testStatus === 'ok' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {testStatus === 'fail' && <XCircle className="h-4 w-4 text-red-400" />}
          {t('settings.voice.testConnection')}
        </Button>
      </SettingRow>
    </SettingsSection>
  )
}
