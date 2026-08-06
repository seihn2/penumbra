import { useEffect, useState } from 'react'
import { OctagonX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Shortcut } from '@/lib/store/shortcuts'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { Button } from '@/components/ui/button'

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return
    }
    setSeconds(0)
    const start = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 250)
    return () => clearInterval(id)
  }, [active])
  return seconds
}

export function StatusBarLeft({
  isReceivingSolution,
  hasActiveConversation,
  shortcuts,
  onStop
}: {
  isReceivingSolution: boolean
  hasActiveConversation: boolean
  shortcuts: Record<string, Shortcut>
  onStop: () => void
}) {
  const { t } = useTranslation()
  const elapsed = useElapsedSeconds(isReceivingSolution)
  if (isReceivingSolution) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-[currentColor]"></div>
        <span className="text-sm">
          {t('statusBar.generating')}
          {elapsed > 0 && <span className="ml-1 text-[var(--text-tertiary)]">{elapsed}s</span>}
        </span>
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex justify-center z-50 pointer-events-none">
          <Button
            variant="secondary"
            className="h-9 px-4 text-sm pointer-events-auto rounded-[var(--r-pill)] bg-red-500/90 text-white hover:bg-red-500"
            onClick={onStop}
          >
            <OctagonX className="w-4 h-4" />
            {t('statusBar.stopGeneration')}
            <ShortcutRenderer
              shortcut={shortcuts.stopSolutionStream?.key ?? ''}
              className="inline-block border bg-transparent py-0 px-1"
            />
          </Button>
        </div>
      </div>
    )
  }

  if (!hasActiveConversation) return null

  return (
    <div className="flex items-center gap-2 pointer-events-none text-xs text-[var(--text-tertiary)]">
      <span>
        <ShortcutRenderer
          shortcut={shortcuts.appendScreenshot?.key ?? ''}
          className="inline-block scale-75 text-xs border border-current bg-transparent py-0 px-1 ml-1"
        />
        {t('statusBar.appendScreenshot')}
      </span>
      <span>
        <ShortcutRenderer
          shortcut={shortcuts.takeScreenshot?.key ?? ''}
          className="inline-block scale-75 text-xs border border-current bg-transparent py-0 px-1"
        />
        {t('statusBar.newConversation')}
      </span>
    </div>
  )
}
