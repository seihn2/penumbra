import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTranscriptionSettings } from '@/lib/store/settings'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useSolutionErrorAction } from '@/lib/store/solution'
import { isMac } from '@/lib/utils/env'
import { resolveAudioSources } from './audio-sources'
import {
  startSystemAudioCapture,
  startMicrophoneAudioCapture,
  stopAudioCapture
} from '@/lib/audio-capture'

const describeError = (err: unknown): string =>
  err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? 'unknown')

/** Shared start/stop transcription action used by both the global shortcut
   (via useTranscriptionController) and the header mic button, so the button is
   a real control rather than a hint. Reads live state from the store to avoid
   stale closures.

   Source strategy:
   - Microphone (the candidate) is always attempted — it's the only reliable
     capture path on macOS, where system-audio loopback is unsupported by
     Electron (Windows-only).
   - System audio (the interviewer) is attempted when dual-source is on, or on
     non-macOS in single mode. On macOS its failure is expected and never
     blocks the mic.
   Transcription starts as long as at least one source comes up; every outcome
   surfaces a toast so the action is never a silent no-op. */
export function useTranscriptionToggle(): () => Promise<void> {
  const { t } = useTranslation()
  const { dashscopeApiKey, dualSourceTranscriptionEnabled, microphoneDeviceId } =
    useTranscriptionSettings()
  const setErrorMessage = useSolutionErrorAction()

  return useCallback(async () => {
    window.api.asrDebugLog(
      `toggle clicked: isMac=${isMac} dual=${dualSourceTranscriptionEnabled} hasKey=${Boolean(dashscopeApiKey)} mic=${microphoneDeviceId || 'default'}`
    )
    const { isTranscribing, setIsTranscribing } = useTranscriptionStore.getState()

    if (isTranscribing) {
      stopAudioCapture()
      await window.api.stopTranscription()
      setIsTranscribing(false)
      toast(t('header.transcriptionOff'))
      return
    }

    if (!dashscopeApiKey) {
      setErrorMessage(t('transcription.noKey'))
      toast.error(t('transcription.noKey'))
      return
    }

    toast.loading(t('transcription.starting'), { id: 'asr-start' })

    const started: string[] = []
    const failures: string[] = []
    const { wantSystemAudio, wantMic } = resolveAudioSources(isMac, dualSourceTranscriptionEnabled)

    // System audio (interviewer): on macOS, Electron loopback is unsupported, so
    // it's only attempted under dual-source; see resolveAudioSources.
    if (wantSystemAudio) {
      try {
        await startSystemAudioCapture()
        await window.api.startTranscriptionSource('system', dashscopeApiKey)
        started.push('system')
      } catch (err) {
        console.error('System audio capture failed:', err)
        window.api.asrDebugLog(`system capture failed: ${describeError(err)}`)
        // Distinguish a permission denial (fixable by granting Screen Recording
        // — no BlackHole needed) from a genuine capture failure.
        const isPermission =
          err instanceof Error &&
          (err.name === 'NotAllowedError' || /permission/i.test(err.message))
        if (isPermission) {
          failures.push(t('transcription.sysAudioPermission'))
        } else if (isMac) {
          failures.push(`${t('transcription.sysAudioMacHint')}［${describeError(err)}］`)
        } else {
          failures.push(`${t('transcription.sourceSystem')}: ${describeError(err)}`)
        }
      }
    }

    // Microphone (candidate): the reliable path on macOS; see resolveAudioSources.
    if (wantMic) {
      try {
        await startMicrophoneAudioCapture(microphoneDeviceId || undefined)
        await window.api.startTranscriptionSource('microphone', dashscopeApiKey)
        started.push('microphone')
      } catch (err) {
        console.error('Microphone capture failed:', err)
        window.api.asrDebugLog(`mic capture failed: ${describeError(err)}`)
        failures.push(`${t('transcription.sourceMic')}: ${describeError(err)}`)
      }
    }

    if (started.length > 0) {
      setIsTranscribing(true)
      setErrorMessage(null)
      if (failures.length > 0) {
        // Partial success: transcription is live. Only surface a transient
        // toast — do NOT route this through setErrorMessage, which renders the
        // scary "API failed / retry" solution banner and reads as a hard
        // failure even though transcription is running.
        toast.warning(`${t('transcription.partialStart')}（${failures.join('；')}）`, {
          id: 'asr-start',
          duration: 6000
        })
      } else {
        toast.success(t('header.transcriptionOn'), { id: 'asr-start' })
      }
    } else {
      stopAudioCapture()
      await window.api.stopTranscription()
      const message = `${t('transcription.startFailed')}（${failures.join('；')}）`
      setErrorMessage(message)
      toast.error(message, { id: 'asr-start' })
    }
  }, [dashscopeApiKey, dualSourceTranscriptionEnabled, microphoneDeviceId, setErrorMessage, t])
}
