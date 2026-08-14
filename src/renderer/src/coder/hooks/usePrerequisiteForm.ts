import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePrerequisiteSettings } from '@/lib/store/settings'
import {
  getActiveAnswerServiceProfile,
  toAnswerServiceProfileActivation
} from '../../../../shared/answer-service-profile'
import { recommendedModelFor } from '../../../../shared/model-catalog'

export function usePrerequisiteForm() {
  const navigate = useNavigate()
  const {
    answerServiceProfiles,
    activeAnswerServiceProfileId,
    answerServiceKeyConfigured,
    answerServiceReady,
    updateAnswerServiceProfile,
    setAnswerServiceAvailability
  } = usePrerequisiteSettings()
  const activeProfile = useMemo(
    () =>
      getActiveAnswerServiceProfile({
        profiles: answerServiceProfiles,
        activeProfileId: activeAnswerServiceProfileId
      }),
    [activeAnswerServiceProfileId, answerServiceProfiles]
  )
  const [inputApiKey, setInputApiKey] = useState('')
  const [inputApiBaseURL, setInputApiBaseURL] = useState(activeProfile.endpoint)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    setInputApiBaseURL(activeProfile.endpoint)
    setInputApiKey('')
  }, [activeProfile.endpoint, activeProfile.id])

  const saveApiSettings = async () => {
    const endpoint = inputApiBaseURL.trim()
    const model = activeProfile.model || recommendedModelFor(endpoint)?.id || ''
    updateAnswerServiceProfile(activeProfile.id, { endpoint, model })
    const nextProfile = { ...activeProfile, endpoint, model }
    if (inputApiKey.trim()) {
      await window.api.saveAnswerServiceKey(activeProfile.credentialRef, inputApiKey.trim())
      setInputApiKey('')
    }
    const result = await window.api.activateAnswerServiceProfile(
      toAnswerServiceProfileActivation(nextProfile)
    )
    setAnswerServiceAvailability(result.keyStatus.phase === 'saved', true)
  }

  const openFullSettings = async () => {
    if (inputApiKey.trim() || inputApiBaseURL.trim() !== activeProfile.endpoint) {
      await saveApiSettings()
    }
    navigate('/settings')
  }

  return {
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
  }
}
