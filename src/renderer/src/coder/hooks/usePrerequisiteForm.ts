import { useState } from 'react'
import { useNavigate } from 'react-router'
import { usePrerequisiteSettings } from '@/lib/store/settings'

export function usePrerequisiteForm() {
  const navigate = useNavigate()
  const { apiKey, apiBaseURL, updateSetting } = usePrerequisiteSettings()
  const [inputApiKey, setInputApiKey] = useState(apiKey)
  const [inputApiBaseURL, setInputApiBaseURL] = useState(apiBaseURL)
  const [showApiKey, setShowApiKey] = useState(false)

  const saveApiSettings = () => {
    if (inputApiKey.trim()) updateSetting('apiKey', inputApiKey.trim())
    if (inputApiBaseURL.trim()) updateSetting('apiBaseURL', inputApiBaseURL.trim())
  }

  const openFullSettings = () => {
    saveApiSettings()
    navigate('/settings')
  }

  return {
    apiKey,
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
