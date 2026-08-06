import { useRef, useState } from 'react'
import { SendHorizontal, Mic, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/lib/store/chat'
import { useSolutionStore } from '@/lib/store/solution'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useSettingValue } from '@/lib/store/settings'
import { useTranscriptionToggle } from './hooks/useTranscriptionToggle'

/** Composer for the chat flow. With no active conversation it starts a new
   text conversation; otherwise it sends a follow-up. */
export function ChatComposer({
  disabled,
  hasConversation
}: {
  disabled?: boolean
  hasConversation: boolean
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  // True while an IME composition (e.g. Pinyin) is active. The candidate popup
  // the input method draws is a separate OS-level window that our window's
  // content protection cannot cover, so it can leak into a screen recording —
  // warn the user while they're composing.
  const [composing, setComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const setIsLoading = useSolutionStore((s) => s.setIsLoading)
  const setErrorMessage = useSolutionStore((s) => s.setErrorMessage)
  const isTranscribing = useTranscriptionStore((s) => s.isTranscribing)
  const toggleTranscription = useTranscriptionToggle()
  const dashscopeApiKey = useSettingValue('dashscopeApiKey')

  // Grow the textarea with its content (capped by the CSS max-height) and
  // collapse back to one line when cleared.
  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const submit = async () => {
    const question = value.trim()
    if (!question || disabled) return
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)
    useChatStore.getState().addUserText(question)
    try {
      const result = hasConversation
        ? await window.api.sendFollowUpQuestion(question)
        : await window.api.startTextConversation(question)
      // Handlers reject invalid state by returning { success: false } rather
      // than throwing, so loading would otherwise hang forever with no hint.
      if (result && result.success === false) {
        setIsLoading(false)
        setErrorMessage(t('workbench.sendFailed'))
      }
    } catch {
      setIsLoading(false)
      setErrorMessage(t('workbench.sendFailed'))
    }
  }

  return (
    <div className="chat-composer-wrap">
      {composing && (
        <div className="ime-warning" role="alert">
          {t('followUp.imeWarning')}
        </div>
      )}
      <div className="chat-composer">
        {dashscopeApiKey && (
          <button
            type="button"
            onClick={toggleTranscription}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-card)] border transition-colors ${
              isTranscribing
                ? 'border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-hover)]'
            }`}
            title={isTranscribing ? t('transcription.stopBtn') : t('transcription.startBtn')}
            aria-label={isTranscribing ? t('transcription.stopBtn') : t('transcription.startBtn')}
          >
            {isTranscribing ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          disabled={disabled}
          placeholder={
            hasConversation ? t('followUp.composerPlaceholder') : t('followUp.startPlaceholder')
          }
          onChange={(e) => {
            setValue(e.target.value)
            autoResize()
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(e) => {
            // Don't submit on the Enter that confirms an IME candidate (CJK input).
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          className="chat-composer-input"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="chat-composer-send"
          title={`${t('followUp.submit')} · Enter`}
          aria-label={t('followUp.submit')}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
