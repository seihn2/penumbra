import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageSquareText,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  KeyRound
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useModelSettings } from '@/lib/store/settings'
import { friendlyConnectionError } from './connection-error'
import { API_BASE_URL_PRESETS } from '../../../shared/api-base-url-presets'
import { Button } from '@/components/ui/button'
import { SelectModel } from './SelectModel'
import { SecretInput, SettingRow, SettingsSection } from './components'
import { recommendedModelFor } from '../../../shared/model-catalog'
import {
  createAnswerServiceProfile,
  getActiveAnswerServiceProfile,
  nextAnswerServiceProfileName,
  toAnswerServiceProfileActivation,
  type AnswerServiceProfile,
  type AnswerServiceProfileActivation
} from '../../../shared/answer-service-profile'
import { createSecretState, type SecretState } from '../../../shared/secret-lifecycle'

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'
type ModelFetchStatus = 'idle' | 'loading' | 'loaded' | 'fail'

export function ModelSettingsSection() {
  const { t } = useTranslation()
  const {
    answerServiceProfiles,
    activeAnswerServiceProfileId,
    answerServiceKeyConfigured,
    addAnswerServiceProfile,
    updateAnswerServiceProfile,
    setActiveAnswerServiceProfile,
    removeAnswerServiceProfile,
    setAnswerServiceAvailability
  } = useModelSettings()
  const activeProfile = useMemo(
    () =>
      getActiveAnswerServiceProfile({
        profiles: answerServiceProfiles,
        activeProfileId: activeAnswerServiceProfileId
      }),
    [activeAnswerServiceProfileId, answerServiceProfiles]
  )
  const [keyDraft, setKeyDraft] = useState('')
  const [keyStatus, setKeyStatus] = useState<SecretState>(createSecretState(false))
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [discoveredModels, setDiscoveredModels] = useState<string[]>(activeProfile.modelCache ?? [])
  const [modelFetchStatus, setModelFetchStatus] = useState<ModelFetchStatus>('idle')
  const activationRequestRef = useRef(0)
  const fetchRequestRef = useRef(0)
  const activeProfileIdRef = useRef(activeProfile.id)
  const activeActivation = useMemo(
    () => toAnswerServiceProfileActivation(activeProfile),
    [activeProfile]
  )

  const activateProfile = useCallback(
    async (activation: AnswerServiceProfileActivation) => {
      const requestId = ++activationRequestRef.current
      try {
        const result = await window.api.activateAnswerServiceProfile(activation)
        if (requestId !== activationRequestRef.current) return null
        setKeyStatus(result.keyStatus)
        setAnswerServiceAvailability(result.keyStatus.phase === 'saved', true)
        return result.keyStatus
      } catch {
        if (requestId !== activationRequestRef.current) return null
        const unset = createSecretState(false)
        setKeyStatus(unset)
        setAnswerServiceAvailability(false, true)
        return unset
      }
    },
    [setAnswerServiceAvailability]
  )

  useEffect(() => {
    if (activeProfileIdRef.current === activeProfile.id) return
    activeProfileIdRef.current = activeProfile.id
    fetchRequestRef.current += 1
    setKeyDraft('')
    setTestStatus('idle')
    setDiscoveredModels(activeProfile.modelCache ?? [])
    setModelFetchStatus('idle')
  }, [activeProfile.id, activeProfile.modelCache])

  useEffect(() => {
    void activateProfile(activeActivation)
  }, [activateProfile, activeActivation])

  const saveDraftKey = useCallback(async (): Promise<boolean> => {
    const rawKey = keyDraft.trim()
    if (!rawKey) return answerServiceKeyConfigured
    try {
      const status = await window.api.saveAnswerServiceKey(activeProfile.credentialRef, rawKey)
      setKeyStatus(status)
      setKeyDraft('')
      setAnswerServiceAvailability(true, true)
      fetchRequestRef.current += 1
      setModelFetchStatus('idle')
      await activateProfile(activeActivation)
      toast.success(t('settings.model.keySaved'))
      return true
    } catch {
      toast.error(t('settings.model.keySaveFail'))
      return false
    }
  }, [
    activateProfile,
    activeActivation,
    activeProfile.credentialRef,
    answerServiceKeyConfigured,
    keyDraft,
    setAnswerServiceAvailability,
    t
  ])

  const fetchModels = useCallback(async () => {
    const hasKey = keyDraft.trim() ? await saveDraftKey() : answerServiceKeyConfigured
    if (!hasKey) return
    const requestId = ++fetchRequestRef.current
    setModelFetchStatus('loading')
    try {
      await activateProfile(activeActivation)
      const result = await window.api.fetchAvailableModels()
      if (requestId !== fetchRequestRef.current) return
      if (result.ok && result.models) {
        setDiscoveredModels(result.models)
        updateAnswerServiceProfile(activeProfile.id, { modelCache: result.models })
        setModelFetchStatus('loaded')
        toast.success(t('settings.model.fetchOk', { count: result.models.length }))
      } else {
        setModelFetchStatus('fail')
        toast.error(
          t('settings.model.fetchFail', {
            error: friendlyConnectionError(t, result.error ?? 'unknown')
          })
        )
      }
    } catch {
      if (requestId !== fetchRequestRef.current) return
      setModelFetchStatus('fail')
      toast.error(t('settings.model.fetchFail', { error: friendlyConnectionError(t, 'unknown') }))
    }
  }, [
    activateProfile,
    activeActivation,
    activeProfile.id,
    answerServiceKeyConfigured,
    keyDraft,
    saveDraftKey,
    t,
    updateAnswerServiceProfile
  ])

  const testConnection = async () => {
    if (testStatus === 'testing') return
    const hasKey = keyDraft.trim() ? await saveDraftKey() : answerServiceKeyConfigured
    if (!hasKey) return
    setTestStatus('testing')
    await activateProfile(activeActivation)
    const timeout = new Promise<{ ok: false; error: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, error: 'timeout' }), 15000)
    )
    try {
      const result = await Promise.race([window.api.testAiConnection(), timeout])
      const lastTest = {
        ok: result.ok,
        at: Date.now(),
        ...(result.error ? { error: result.error } : {})
      }
      updateAnswerServiceProfile(activeProfile.id, { lastTest })
      if (result.ok) {
        setTestStatus('ok')
        toast.success(t('settings.model.testOk'))
      } else {
        setTestStatus('fail')
        toast.error(
          t('settings.model.testFail', { error: friendlyConnectionError(t, result.error) })
        )
      }
    } catch {
      setTestStatus('fail')
      updateAnswerServiceProfile(activeProfile.id, {
        lastTest: { ok: false, at: Date.now(), error: 'unknown' }
      })
      toast.error(t('settings.model.testFail', { error: friendlyConnectionError(t, 'unknown') }))
    }
  }

  const addProfile = () => {
    const id = `answer-${crypto.randomUUID()}`
    const profile = createAnswerServiceProfile({
      id,
      name: nextAnswerServiceProfileName(answerServiceProfiles)
    })
    addAnswerServiceProfile(profile)
    toast.success(t('settings.model.profileAdded'))
  }

  const deleteProfile = async () => {
    if (!window.confirm(t('settings.model.deleteProfileConfirm', { name: activeProfile.name }))) {
      return
    }
    await window.api.deleteAnswerServiceKey(activeProfile.credentialRef)
    removeAnswerServiceProfile(activeProfile.id)
    toast.success(t('settings.model.profileDeleted'))
  }

  const deleteKey = async () => {
    await window.api.deleteAnswerServiceKey(activeProfile.credentialRef)
    const unset = createSecretState(false)
    setKeyStatus(unset)
    setKeyDraft('')
    setAnswerServiceAvailability(false, true)
    fetchRequestRef.current += 1
    setModelFetchStatus('idle')
    toast.success(t('settings.model.keyDeleted'))
  }

  const updateActiveProfile = (
    patch: Partial<Pick<AnswerServiceProfile, 'name' | 'endpoint' | 'model' | 'protocol'>>
  ) => {
    updateAnswerServiceProfile(activeProfile.id, patch)
    setTestStatus('idle')
    if (patch.endpoint !== undefined) {
      fetchRequestRef.current += 1
      setModelFetchStatus('idle')
    }
  }

  const keyIsSaved = keyStatus.phase === 'saved' || answerServiceKeyConfigured

  return (
    <SettingsSection
      icon={MessageSquareText}
      title={t('settings.model.title')}
      description={t('settings.model.desc')}
    >
      <SettingRow title={t('settings.model.profile')} description={t('settings.model.profileDesc')}>
        <div className="flex w-full items-center gap-2">
          <select
            className="settings-select flex-1"
            value={activeProfile.id}
            onChange={(event) => setActiveAnswerServiceProfile(event.target.value)}
          >
            {answerServiceProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={addProfile}
            title={t('settings.model.addProfile')}
            aria-label={t('settings.model.addProfile')}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void deleteProfile()}
            title={t('settings.model.deleteProfile')}
            aria-label={t('settings.model.deleteProfile')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.model.profileName')}
        description={t('settings.model.profileNameDesc')}
      >
        <input
          className="settings-input"
          value={activeProfile.name}
          onChange={(event) => updateActiveProfile({ name: event.target.value })}
        />
      </SettingRow>
      <SettingRow
        title={t('prerequisites.apiBaseUrl')}
        description={t('settings.model.baseUrlDesc')}
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full gap-2">
            <input
              className="settings-input flex-1"
              type="text"
              value={activeProfile.endpoint}
              onChange={(event) => updateActiveProfile({ endpoint: event.target.value })}
              placeholder={t('settings.model.baseUrlPlaceholder')}
            />
            <select
              className="settings-select !w-40 shrink-0"
              value={
                API_BASE_URL_PRESETS.some((preset) => preset.url === activeProfile.endpoint)
                  ? activeProfile.endpoint
                  : ''
              }
              onChange={(event) => {
                if (!event.target.value) return
                const recommendedModel = recommendedModelFor(event.target.value)?.id
                updateActiveProfile({
                  endpoint: event.target.value,
                  ...(recommendedModel ? { model: recommendedModel } : {})
                })
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
      <SettingRow
        title={t('settings.model.protocolLabel')}
        description={t('settings.model.protocolDesc')}
      >
        <select
          className="settings-select"
          value={activeProfile.protocol}
          onChange={(event) =>
            updateActiveProfile({
              protocol: event.target.value as AnswerServiceProfile['protocol']
            })
          }
        >
          <option value="auto">{t('settings.model.protocolAuto')}</option>
          <option value="responses">{t('settings.model.protocolResponses')}</option>
          <option value="chat-completions">{t('settings.model.protocolChat')}</option>
          <option value="anthropic-messages">{t('settings.model.protocolAnthropic')}</option>
        </select>
      </SettingRow>
      <SettingRow
        title={t('prerequisites.apiKey')}
        description={
          keyIsSaved
            ? t('settings.model.keyStored', { suffix: keyStatus.maskedSuffix ?? '••••' })
            : t('settings.model.keyNotStored')
        }
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full items-center gap-2">
            <SecretInput
              value={keyDraft}
              onChange={setKeyDraft}
              placeholder={
                keyIsSaved
                  ? t('settings.model.apiKeyReplacePlaceholder')
                  : t('settings.model.apiKeyPlaceholder')
              }
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!keyDraft.trim()}
              onClick={() => void saveDraftKey()}
            >
              <KeyRound className="h-4 w-4" />
              {keyIsSaved ? t('settings.model.replaceKey') : t('settings.model.saveKey')}
            </Button>
            {keyIsSaved && (
              <Button variant="ghost" size="sm" onClick={() => void deleteKey()}>
                {t('settings.model.deleteKey')}
              </Button>
            )}
          </div>
        </div>
      </SettingRow>
      <SettingRow
        title={t('settings.model.modelLabel')}
        description={t('settings.model.modelDesc')}
      >
        <div className="flex w-full flex-col gap-2">
          <SelectModel
            value={activeProfile.model}
            apiBaseURL={activeProfile.endpoint}
            discoveredModels={discoveredModels}
            fetchingModels={modelFetchStatus === 'loading'}
            canRefresh={keyIsSaved || Boolean(keyDraft.trim())}
            onRefresh={() => void fetchModels()}
            onChange={(value) => updateActiveProfile({ model: value })}
          />
          <div className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            {modelFetchStatus === 'loading' && t('settings.model.fetching')}
            {modelFetchStatus === 'loaded' &&
              t('settings.model.fetched', { count: discoveredModels.length })}
            {modelFetchStatus === 'fail' && t('settings.model.fetchFailed')}
            {modelFetchStatus === 'idle' &&
              (discoveredModels.length
                ? t('settings.model.cached', { count: discoveredModels.length })
                : t('settings.model.fetchHint'))}
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
          disabled={(!keyIsSaved && !keyDraft.trim()) || testStatus === 'testing'}
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
