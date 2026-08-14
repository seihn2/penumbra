import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTranscriptionControllerActions, useTranscriptionStore } from '@/lib/store/transcription'
import { useSolutionErrorAction } from '@/lib/store/solution'
import { useShortcut } from '@/lib/store/shortcuts'
import { useTranscriptionSettings, useSettingsStore } from '@/lib/store/settings'
import { stopAudioCapture } from '@/lib/audio-capture'
import { getShortcutAccelerator } from '@/lib/utils/keyboard'
import { audioAttentionEvents } from '../../../../shared/audio-attention'
import { partition } from '../../../../shared/attention-event'
import { friendlyTranscriptionError } from './transcription-error'
import { useTranscriptionToggle } from './useTranscriptionToggle'

export function useTranscriptionController(): void {
  const { t } = useTranslation()
  const toggleTranscription = useTranscriptionToggle()
  const toggleShortcut = useShortcut('toggleTranscription')
  const { dashscopeApiKey } = useTranscriptionSettings()
  const {
    setIsTranscribing,
    setTranscriptionText,
    addTranslation,
    setInterviewCoach,
    setDetectedQuestion,
    setAssistLoading,
    setLiveAssist,
    addAssist,
    setSummary,
    addMemoryCandidates,
    setError,
    clearPendingText,
    clearText
  } = useTranscriptionControllerActions()
  const setErrorMessage = useSolutionErrorAction()

  // Startup diagnostic (no user action needed): records whether the renderer
  // actually received the DashScope key, so an empty log after "I clicked"
  // distinguishes "key missing → button hidden" from "click never fired".
  useEffect(() => {
    window.api.asrDebugLog(
      `CoderPage mounted: hasDashscopeKey=${Boolean(dashscopeApiKey)} keyLen=${dashscopeApiKey?.length ?? 0} shortcut=${toggleShortcut?.key ?? 'none'} opacity=${useSettingsStore.getState().overallOpacity}/${useSettingsStore.getState().opacity}/${useSettingsStore.getState().textOpacity}`
    )
  }, [dashscopeApiKey, toggleShortcut?.key])

  // Recover live state from the main process on mount. Transcription runs in
  // the main process and outlives renderer reloads / route changes, so if it's
  // still active we must reflect that instead of showing a stopped UI.
  useEffect(() => {
    let cancelled = false
    window.api.getLiveState().then((live) => {
      if (!cancelled && live.active) setIsTranscribing(true)
    })
    return () => {
      cancelled = true
    }
  }, [setIsTranscribing])

  useEffect(() => {
    window.api.onToggleTranscription(toggleTranscription)
    return () => {
      window.api.removeToggleTranscriptionListener()
    }
  }, [toggleTranscription])

  // Window-level fallback: if the OS global shortcut isn't delivered (macOS can
  // swallow some combos), the same key still toggles transcription whenever the
  // window has focus. Matches the configured accelerator, plus a hardcoded
  // Cmd/Ctrl+Shift+T so it works even if the persisted binding is stale.
  useEffect(() => {
    const configured = toggleShortcut?.key
    const onKeyDown = (event: KeyboardEvent): void => {
      const accel = getShortcutAccelerator(event)
      const isConfigured = configured != null && accel === configured
      const isHardcoded =
        event.code === 'KeyT' && event.shiftKey && (event.metaKey || event.ctrlKey)
      if (isConfigured || isHardcoded) {
        event.preventDefault()
        toggleTranscription()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleShortcut?.key, toggleTranscription])

  useEffect(() => {
    window.api.onTranscriptionText((data) => {
      setTranscriptionText(data.text)
    })
    window.api.onTranscriptionError((message) => {
      setErrorMessage(friendlyTranscriptionError(t, message))
      setIsTranscribing(false)
      stopAudioCapture()
    })
    window.api.onTranscriptionStopped(() => {
      setIsTranscribing(false)
    })
    // Route audio reliability through the single AttentionGovernor: only a full
    // audio loss (both sources down) preempts with a critical toast; a terminal
    // single-source drop is a low-priority warning. Dedup keys double as toast
    // ids so the same concern can't stack.
    window.api.onAudioStatus((state) => {
      const { preempting, later } = partition(audioAttentionEvents(state))
      for (const event of preempting) {
        toast.error(t('transcription.audioAllLost'), { id: event.dedupeKey, duration: 8000 })
      }
      for (const event of later) {
        const source =
          event.source === 'audio-microphone'
            ? t('transcription.sourceMic')
            : t('transcription.sourceSystem')
        toast.warning(t('transcription.audioSourceLost', { source }), {
          id: event.dedupeKey,
          duration: 5000
        })
      }
    })
    window.api.onTranscriptionCleared(() => {
      // Pending transcript consumed/discarded — keep the coaching session alive.
      clearPendingText()
    })
    window.api.onTranscriptionSessionCleared(() => {
      // Interview ended — wipe the full coaching session.
      clearText()
    })
    window.api.onTranscriptionTranslation((payload) => {
      addTranslation(payload)
    })
    window.api.onTranscriptionTranslationError((message) => {
      setError(message)
    })
    window.api.onInterviewCoachUpdated((state) => {
      setInterviewCoach(state)
    })
    window.api.onInterviewQuestionDetected((question) => {
      setDetectedQuestion(question)
    })
    window.api.onInterviewAssistLoading(() => {
      setAssistLoading(true)
    })
    window.api.onInterviewAssistChunk((payload) => {
      setLiveAssist(payload.points)
    })
    window.api.onInterviewAssist((payload) => {
      addAssist(payload)
    })
    window.api.onInterviewAssistError(() => {
      setAssistLoading(false)
    })
    window.api.onInterviewSummary((payload) => {
      setSummary(payload.summary)
    })
    window.api.onMemoryCandidates((payload) => {
      addMemoryCandidates(payload.candidates)
    })

    return () => {
      window.api.removeTranscriptionTextListener()
      window.api.removeTranscriptionErrorListener()
      window.api.removeTranscriptionStoppedListener()
      window.api.removeAudioStatusListener()
      window.api.removeTranscriptionClearedListener()
      window.api.removeTranscriptionSessionClearedListener()
      window.api.removeTranscriptionTranslationListener()
      window.api.removeTranscriptionTranslationErrorListener()
      window.api.removeInterviewCoachUpdatedListener()
      window.api.removeInterviewAssistListeners()
    }
  }, [
    setTranscriptionText,
    setErrorMessage,
    setIsTranscribing,
    addTranslation,
    setInterviewCoach,
    setDetectedQuestion,
    setAssistLoading,
    setLiveAssist,
    addAssist,
    setSummary,
    addMemoryCandidates,
    setError,
    clearPendingText,
    clearText,
    t
  ])

  useEffect(() => {
    return () => {
      if (useTranscriptionStore.getState().isTranscribing) {
        stopAudioCapture()
        window.api.stopTranscription()
      }
    }
  }, [])
}
