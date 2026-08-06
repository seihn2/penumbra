import { MessageCircle, Pointer, PointerOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Shortcut } from '@/lib/store/shortcuts'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store/app'
import { getShortcutAcceleratorDisplay } from '@/lib/utils/keyboard'

export function StatusBarRight({
  hasActiveConversation,
  isReceivingSolution,
  ignoreMouse,
  shortcuts,
  onFollowUp
}: {
  hasActiveConversation: boolean
  isReceivingSolution: boolean
  ignoreMouse: boolean
  shortcuts: Record<string, Shortcut>
  onFollowUp: () => void
}) {
  const { t } = useTranslation()
  const mouseKey = shortcuts.ignoreOrEnableMouse?.key
  const mouseKeyDisplay = mouseKey ? getShortcutAcceleratorDisplay(mouseKey) : ''
  const toggleMouse = (): void => {
    const next = !useAppStore.getState().ignoreMouse
    useAppStore.getState().setIgnoreMouse(next)
    window.api.updateAppState({ ignoreMouse: next })
  }
  return (
    <div className="flex items-center space-x-4 select-none">
      {hasActiveConversation && !isReceivingSolution && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onFollowUp}
          className="h-8 rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-3 text-xs text-[var(--accent)] hover:bg-[var(--accent-hover)]"
          disabled={isReceivingSolution}
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          {t('statusBar.askFollowUp')}
        </Button>
      )}
      <button
        type="button"
        onClick={toggleMouse}
        className="tip flex items-center gap-2 rounded-[var(--r-control)] px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
        aria-label={t('statusBar.disableMousePassthrough')}
        title={
          mouseKeyDisplay
            ? `${t('statusBar.disableMousePassthrough')} · ${mouseKeyDisplay}`
            : t('statusBar.disableMousePassthrough')
        }
        data-tip={
          mouseKeyDisplay
            ? `${t('statusBar.disableMousePassthrough')} · ${mouseKeyDisplay}`
            : t('statusBar.disableMousePassthrough')
        }
      >
        {ignoreMouse ? (
          <>
            <PointerOff className="h-4 w-4" />
            <span>
              {t('statusBar.disableMousePassthrough')}
              {mouseKey && (
                <ShortcutRenderer
                  shortcut={mouseKey}
                  className="ml-1 inline-block scale-75 border border-current bg-transparent px-1 py-0 text-xs"
                />
              )}
            </span>
          </>
        ) : (
          <Pointer className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
