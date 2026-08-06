import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquareText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useModelSettings, useSettingsStore } from '@/lib/store/settings'
import { pickMainProcessSettings } from '@/lib/settings/main-process-sync'
import { friendlyConnectionError } from './connection-error'
import { API_BASE_URL_PRESETS } from '../../../shared/api-base-url-presets'
import { Button } from '@/components/ui/button'
import { SelectModel } from './SelectModel'
import { SecretInput, SettingRow, SettingsSection } from './components'
import { MODEL_CATALOG_UPDATED_AT, recommendedModelFor } from '../../../shared/model-catalog'

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'
type ModelFetchStatus = 'idle' | 'loading' | 'loaded' | 'fail'

export function ModelSettingsSection() {
  const { t } = useTranslation()
  const { apiBaseURL, apiKey, model, updateSetting } = useModelSettings()
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [modelFetchStatus, setModelFetchStatus] = useState<ModelFetchStatus>('idle')
  const fetchRequestRef = useRef(0)

  const fetchModels = useCallback(
    async (notify: boolean) => {
      if (!apiKey.trim()) return
      const requestId = ++fetchRequestRef.current
      setModelFetchStatus('loading')
      try {
        await window.api.updateAppSettings(pickMainProcessSettings(useSettingsStore.getState()))
        const result = await window.api.fetchAvailableModels()
        if (requestId !== fetchRequestRef.current) return
        if (result.ok && result.models) {
          setDiscoveredModels(result.models)
          setModelFetchStatus('loaded')
          if (notify) toast.success(t('settings.model.fetchOk', { count: result.models.length }))
        } else {
          setModelFetchStatus('fail')
          if (notify) {
            toast.error(
              t('settings.model.fetchFail', {
                error: friendlyConnectionError(t, result.error ?? 'unknown')
              })
            )
          }
        }
      } catch {
        if (requestId !== fetchRequestRef.current) return
        setModelFetchStatus('fail')
        if (notify) {
          toast.error(
            t('settings.model.fetchFail', { error: friendlyConnectionError(t, 'unknown') })
          )
        }
      }
    },
    [apiKey, t]
  )

  useEffect(() => {
    fetchRequestRef.current += 1
    setDiscoveredModels([])
    setModelFetchStatus('idle')
    if (!apiKey.trim()) {
      return () => {
        fetchRequestRef.current += 1
      }
    }

    const timer = window.setTimeout(() => void fetchModels(false), 800)
    return () => {
      window.clearTimeout(timer)
      fetchRequestRef.current += 1
    }
  }, [apiBaseURL, apiKey, fetchModels])

  const testConnection = async () => {
    if (!apiKey.trim() || testStatus === 'testing') return
    setTestStatus('testing')
    // Flush the latest settings to the main process before probing, so the
    // test uses the just-edited key/baseURL/model rather than a stale sync.
    await window.api.updateAppSettings(pickMainProcessSettings(useSettingsStore.getState()))
    // Front-end safety net: don't spin forever if the IPC never resolves.
    const timeout = new Promise<{ ok: false; error: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), 15000)
    )
    try {
      const result = await Promise.race([window.api.testAiConnection(), timeout])
      if (result.ok) {
        setTestStatus('ok')
        toast.success(t('settings.model.testOk'))
        void fetchModels(false)
      } else {
        setTestStatus('fail')
        toast.error(
          t('settings.model.testFail', { error: friendlyConnectionError(t, result.error) })
        )
      }
    } catch {
      setTestStatus('fail')
      toast.error(t('settings.model.testFail', { error: friendlyConnectionError(t, 'unknown') }))
    }
  }

  return (
    <SettingsSection
      icon={MessageSquareText}
      title={t('settings.model.title')}
      description={t('settings.model.desc')}
    >
      <SettingRow
        title={t('prerequisites.apiBaseUrl')}
        description={t('settings.model.baseUrlDesc')}
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full gap-2">
            <input
              className="settings-input flex-1"
              type="text"
              value={apiBaseURL}
              onChange={(event) => {
                updateSetting('apiBaseURL', event.target.value)
                setTestStatus('idle')
              }}
              placeholder={t('settings.model.baseUrlPlaceholder')}
            />
            <select
              className="settings-select !w-40 shrink-0"
              value={API_BASE_URL_PRESETS.some((p) => p.url === apiBaseURL) ? apiBaseURL : ''}
              onChange={(event) => {
                if (!event.target.value) return
                updateSetting('apiBaseURL', event.target.value)
                const recommendedModel = recommendedModelFor(event.target.value)?.id
                if (recommendedModel) updateSetting('model', recommendedModel)
                setTestStatus('idle')
              }}
            >
              <option value="">{t('settings.model.presetPlaceholder')}</option>
              {API_BASE_URL_PRESETS.map((preset) => (
                <option key={preset.url} value={preset.url}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SettingRow>
      <SettingRow title={t('prerequisites.apiKey')}>
        <SecretInput
          value={apiKey}
          onChange={(value) => {
            updateSetting('apiKey', value)
            setTestStatus('idle')
          }}
          placeholder={t('settings.model.apiKeyPlaceholder')}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.model.modelLabel')}
        description={t('settings.model.modelDesc')}
      >
        <div className="flex w-full flex-col gap-2">
          <SelectModel
            value={model}
            apiBaseURL={apiBaseURL}
            discoveredModels={discoveredModels}
            fetchingModels={modelFetchStatus === 'loading'}
            canRefresh={Boolean(apiKey.trim())}
            onRefresh={() => void fetchModels(true)}
            onChange={(value) => {
              updateSetting('model', value)
              setTestStatus('idle')
            }}
          />
          <div className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            {modelFetchStatus === 'loading' && t('settings.model.fetching')}
            {modelFetchStatus === 'loaded' &&
              t('settings.model.fetched', { count: discoveredModels.length })}
            {modelFetchStatus === 'fail' && t('settings.model.fetchAutoFailed')}
            {modelFetchStatus === 'idle' && t('settings.model.fetchHint')}
            <span className="ml-1">
              {t('settings.model.catalogUpdated', { date: MODEL_CATALOG_UPDATED_AT })}
            </span>
          </div>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.model.testConnection')}
        description={t('settings.model.testConnectionDesc')}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!apiKey.trim() || testStatus === 'testing'}
          onClick={testConnection}
        >
          {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
          {testStatus === 'ok' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {testStatus === 'fail' && <XCircle className="h-4 w-4 text-red-400" />}
          {t('settings.model.testConnection')}
        </Button>
      </SettingRow>
    </SettingsSection>
  )
}
