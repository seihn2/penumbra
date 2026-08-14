import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PrerequisiteSecretField, PrerequisiteTextField } from './PrerequisiteField'
import { usePrerequisiteForm } from './hooks/usePrerequisiteForm'

export function PrerequisitesChecker() {
  const { t } = useTranslation()
  const {
    answerServiceKeyConfigured,
    answerServiceReady,
    inputApiKey,
    inputApiBaseURL,
    showApiKey,
    setInputApiKey,
    setInputApiBaseURL,
    setShowApiKey,
    saveApiSettings,
    openFullSettings
  } = usePrerequisiteForm()

  // Wait for main-process profile activation before deciding whether setup is
  // needed; this avoids a first-frame flash for users with a saved profile key.
  if (!answerServiceReady || answerServiceKeyConfigured) {
    return null
  }

  const submitIfReady = () => {
    if (inputApiKey.trim()) void saveApiSettings()
  }

  return (
    <div className="fixed top-9 left-0 right-0 bottom-0 flex bg-black/50">
      <div className="m-auto w-120 rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] p-6 text-[var(--text-primary)]">
        <h1 className="mb-2 text-center text-lg font-semibold text-[var(--text-primary)]">
          {t('prerequisites.welcome')}
        </h1>
        <div className="text-sm text-[var(--text-secondary)]">
          {t('prerequisites.intro')}
          <a
            href="https://cloud.siliconflow.cn/i/SG8C0772"
            target="_blank"
            rel="noreferrer"
            className="mx-1 text-[var(--accent)] hover:brightness-125"
          >
            {t('prerequisites.siliconflow')}
          </a>
          {t('prerequisites.introMid')}
          <a
            href="https://openrouter.ai/"
            target="_blank"
            rel="noreferrer"
            className="mx-1 text-[var(--accent)] hover:brightness-125"
          >
            OpenRouter
          </a>
          {t('prerequisites.introEnd')}
        </div>

        <div className="space-y-2 my-4">
          <PrerequisiteTextField
            label={t('prerequisites.apiBaseUrl')}
            helper={t('prerequisites.apiBaseUrlHelper')}
            value={inputApiBaseURL}
            onChange={setInputApiBaseURL}
            onSubmit={submitIfReady}
            placeholder={t('prerequisites.apiBaseUrlPlaceholder')}
          />
          <PrerequisiteSecretField
            value={inputApiKey}
            visible={showApiKey}
            onChange={setInputApiKey}
            onVisibleChange={setShowApiKey}
            onSubmit={submitIfReady}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => void openFullSettings()} className="flex-1">
            {t('prerequisites.moreSettings')}
          </Button>
          <Button
            disabled={!inputApiKey.trim()}
            className="flex-[2]"
            onClick={() => void saveApiSettings()}
          >
            {t('prerequisites.start')}
          </Button>
        </div>
      </div>
    </div>
  )
}
