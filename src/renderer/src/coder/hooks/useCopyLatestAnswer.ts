import { useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/lib/store/chat'
import { selectAnswerCopyText } from '../../../../shared/answer-copy'

/** Wire the global "copy latest answer" shortcut to the clipboard.
 *
 * In mouse-passthrough mode (used during interviews) the per-code-block copy
 * button can't be hovered or clicked, so this lets the user grab the AI's
 * latest code hands-free. Copies the first code block of the most recent
 * assistant answer, or the whole answer if it has no code block. */
export function useCopyLatestAnswer(): void {
  const { t } = useTranslation()

  useEffect(() => {
    window.api.onCopyLatestAnswer(async () => {
      // Read fresh from the store so we always copy the current latest answer,
      // not a value captured when the listener was first registered.
      const messages = useChatStore.getState().messages
      const latestAnswer = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && !m.streaming && m.text.trim())?.text

      const copyText = selectAnswerCopyText(latestAnswer)
      if (!copyText) {
        toast.error(t('workbench.copyLatestEmpty'))
        return
      }
      try {
        await navigator.clipboard.writeText(copyText)
        toast.success(t('workbench.copyLatestDone'))
      } catch {
        // Clipboard rejected (denied / insecure context); don't claim success.
        toast.error(t('workbench.copyLatestFailed'))
      }
    })
    return () => {
      window.api.removeCopyLatestAnswerListener()
    }
  }, [t])
}
