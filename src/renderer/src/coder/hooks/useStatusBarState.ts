import { useIgnoreMouse } from '@/lib/store/app'
import { useShortcuts } from '@/lib/store/shortcuts'
import { useSolutionStatus } from '@/lib/store/solution'

export function useStatusBarState() {
  const {
    isLoading: isReceivingSolution,
    setIsLoading,
    screenshotData,
    solutionChunks
  } = useSolutionStatus()
  const ignoreMouse = useIgnoreMouse()
  const shortcuts = useShortcuts()
  const hasActiveConversation = Boolean(screenshotData && solutionChunks.length > 0)

  const stopGeneration = () => {
    setIsLoading(false)
    void window.api.stopSolutionStream()
  }

  return {
    isReceivingSolution,
    hasActiveConversation,
    ignoreMouse,
    shortcuts,
    stopGeneration
  }
}
