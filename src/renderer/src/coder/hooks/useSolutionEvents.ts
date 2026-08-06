import { useEffect } from 'react'
import { useSolutionActions, useSolutionErrorAction } from '@/lib/store/solution'
import { useChatActions } from '@/lib/store/chat'

export function useSolutionEvents({
  setRecentScreenshots
}: {
  setRecentScreenshots: (screenshots: string[]) => void
}): void {
  const { setScreenshotData, setIsLoading, addSolutionChunk, clearSolution } = useSolutionActions()
  const setErrorMessage = useSolutionErrorAction()
  const chat = useChatActions()

  useEffect(() => {
    window.api.onScreenshotTaken((data: string) => {
      setScreenshotData(data)
      chat.addUserScreenshot(data)
    })

    window.api.onScreenshotsUpdated((screenshots: string[]) => {
      setRecentScreenshots(screenshots)
    })

    window.api.onSolutionClear(() => {
      clearSolution()
      setRecentScreenshots([])
      setScreenshotData(null)
      setErrorMessage(null)
      chat.clear()
    })

    // Reset just the solution panel (chunks/error/loading) WITHOUT wiping chat
    // messages — used when starting a text conversation, so the optimistic
    // first-question bubble the composer just added survives.
    window.api.onSolutionResetPanel(() => {
      clearSolution()
      setErrorMessage(null)
    })

    // Retry: drop the failed assistant bubble and reset the panel, but keep the
    // rest of the conversation so retrying never wipes history.
    window.api.onSolutionRetryReset(() => {
      clearSolution()
      setErrorMessage(null)
      chat.dropLastErroredAssistant()
    })

    window.api.onSolutionChunk((chunk: string) => {
      addSolutionChunk(chunk)
      // Follow-up separators are noise in the chat view.
      if (chunk.trim() === '---') return
      chat.appendAssistant(chunk)
    })

    window.api.onAiLoadingStart(() => {
      setIsLoading(true)
      setErrorMessage(null)
      chat.startAssistant()
    })
    window.api.onAiLoadingEnd(() => {
      setIsLoading(false)
    })

    return () => {
      window.api.removeScreenshotListener()
      window.api.removeScreenshotsUpdatedListener()
      window.api.removeSolutionChunkListener()
      window.api.removeAiLoadingStartListener()
      window.api.removeAiLoadingEndListener()
      window.api.removeSolutionClearListener()
      window.api.removeSolutionResetPanelListener()
      window.api.removeSolutionRetryResetListener()
    }
  }, [
    setRecentScreenshots,
    setScreenshotData,
    clearSolution,
    setIsLoading,
    addSolutionChunk,
    setErrorMessage,
    chat
  ])

  useEffect(() => {
    window.api.onSolutionComplete(() => {
      setIsLoading(false)
      chat.finishAssistant()
    })
    window.api.onSolutionStopped(() => {
      setIsLoading(false)
      chat.finishAssistant()
    })
    window.api.onSolutionError((message: string) => {
      setIsLoading(false)
      setErrorMessage(message)
      chat.failAssistant(message)
    })
    return () => {
      window.api.removeSolutionCompleteListener()
      window.api.removeSolutionStoppedListener()
      window.api.removeSolutionErrorListener()
    }
  }, [setIsLoading, setErrorMessage, chat])
}
