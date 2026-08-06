import {
  SettingsIcon,
  HelpCircle,
  X,
  SquarePen,
  History,
  Download,
  Mic,
  MicOff,
  ShieldCheck,
  Target,
  GraduationCap,
  LayoutGrid,
  type LucideIcon
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useIgnoreMouse } from '@/lib/store/app'
import { useChatStore, useChatMessages } from '@/lib/store/chat'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useShortcut } from '@/lib/store/shortcuts'
import { conversationToMarkdown } from '@/lib/utils/conversation-export'
import { getShortcutAcceleratorDisplay } from '@/lib/utils/keyboard'
import {
  controlsForSurface,
  hasControlCenter,
  type ControlId
} from '../../../shared/control-surface'
import { useHistoryUi } from './useHistoryUi'
import { useTranscriptionToggle } from './hooks/useTranscriptionToggle'
import { EgressCapsule } from './EgressCapsule'
import { SelfCheckPanel } from './SelfCheckPanel'
import { OpportunityBriefPanel } from './OpportunityBriefPanel'
import { MockInterviewPanel } from './MockInterviewPanel'
import { isMac } from '@/lib/utils/env'

interface ControlEntry {
  icon: LucideIcon
  label: string
  onClick: () => void
  /** Extra classes for the icon button (e.g. the mic's live-red state). */
  className?: string
  /** Optional live indicator dot rendered inside the overlay button. */
  adornment?: ReactNode
}

export function AppHeader() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const ignoreMouse = useIgnoreMouse()
  const toggleHistory = useHistoryUi((s) => s.toggle)
  const messages = useChatMessages()
  const hasMessages = messages.length > 0
  const isTranscribing = useTranscriptionStore((s) => s.isTranscribing)
  const toggleShortcut = useShortcut('toggleTranscription')
  const toggleTranscription = useTranscriptionToggle()
  const [selfCheckOpen, setSelfCheckOpen] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [mockOpen, setMockOpen] = useState(false)

  // The mic button directly starts/stops transcription (it used to only show a
  // hint, which left users with no working entry point when the global shortcut
  // was swallowed by the OS). The shortcut hint is still surfaced via the title.
  const keyDisplay = toggleShortcut
    ? getShortcutAcceleratorDisplay(toggleShortcut.key)
    : isMac
      ? '⌘⇧T'
      : 'Ctrl+Shift+T'
  const micTitle = isTranscribing
    ? t('header.transcriptionStopHint', { key: keyDisplay })
    : t('header.transcriptionStartHint', { key: keyDisplay })

  const exportConversation = async () => {
    const markdown = conversationToMarkdown(useChatStore.getState().messages)
    if (!markdown) return
    const ok = await window.api.exportConversationMarkdown(markdown)
    if (ok) toast.success(t('header.exported'))
  }

  // Registry: every header control keyed by its stable id. The overlay/center
  // split is decided by the pure control-surface partition (P1#31), so the two
  // surfaces can never drift apart or duplicate a control.
  const registry: Record<ControlId, ControlEntry> = {
    transcription: {
      icon: isTranscribing ? Mic : MicOff,
      label: micTitle,
      onClick: toggleTranscription,
      className: isTranscribing ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300' : undefined,
      adornment: isTranscribing ? (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      ) : undefined
    },
    export: { icon: Download, label: t('header.export'), onClick: exportConversation },
    'new-conversation': {
      icon: SquarePen,
      label: t('header.newConversation'),
      onClick: () => window.api.clearConversation()
    },
    history: { icon: History, label: t('history.title'), onClick: () => toggleHistory() },
    mock: { icon: GraduationCap, label: t('mock.title'), onClick: () => setMockOpen(true) },
    brief: { icon: Target, label: t('brief.title'), onClick: () => setBriefOpen(true) },
    'self-check': {
      icon: ShieldCheck,
      label: t('selfCheck.title'),
      onClick: () => setSelfCheckOpen(true)
    },
    settings: {
      icon: SettingsIcon,
      label: `${t('header.settings')} · ${isMac ? '⌘,' : 'Ctrl+,'}`,
      onClick: () => navigate('/settings')
    },
    help: { icon: HelpCircle, label: t('header.help'), onClick: () => navigate('/help') },
    close: {
      icon: X,
      label: t('header.close'),
      onClick: () => window.close(),
      className: 'hover:bg-red-500/15 hover:text-red-300'
    }
  }

  const ctx = { hasConversation: hasMessages, isMac }
  const overlayIds = controlsForSurface('overlay', ctx)
  const centerIds = controlsForSurface('center', ctx)
  const baseBtn =
    'tip relative size-8 cursor-pointer rounded-[var(--r-control)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'

  const renderOverlay = (id: ControlId): ReactNode => {
    const c = registry[id]
    return (
      <Button
        key={id}
        variant="ghost"
        className={c.className ? `${baseBtn} ${c.className}` : baseBtn}
        title={c.label}
        data-tip={c.label}
        aria-label={c.label}
        onClick={c.onClick}
      >
        <c.icon className="h-4 w-4" />
        {c.adornment}
      </Button>
    )
  }

  return (
    <header id="app-header" role="banner" className="flex items-center justify-between text-white">
      <div className={`flex items-center gap-2.5 ${isMac ? 'pl-[78px]' : 'pl-4'}`}>
        <div className="flex h-6 w-6 items-center justify-center rounded-[var(--r-control)] bg-[var(--accent-soft)]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <defs>
              <clipPath id="hdrEclipse">
                <circle cx="12" cy="12" r="8" />
              </clipPath>
            </defs>
            {/* Eclipse: lit disc echoing the app icon, with a dark body sliding
                across it to leave a warm crescent on the right. */}
            <g clipPath="url(#hdrEclipse)">
              <circle cx="12" cy="12" r="8" fill="var(--accent)" />
              <circle cx="8.5" cy="12" r="8" fill="var(--accent-soft)" />
              <circle cx="8.5" cy="12" r="8" fill="#0b0812" fillOpacity="0.9" />
            </g>
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
          </svg>
        </div>
        <div className="text-sm font-semibold leading-none tracking-tight text-[var(--text-primary)]">
          {t('header.appName')}
        </div>
      </div>
      <div
        role="toolbar"
        aria-label={t('header.controlCenter')}
        className={`actions flex items-center gap-0.5 pr-2 ${ignoreMouse ? 'pointer-events-none' : ''}`}
      >
        <EgressCapsule />
        {overlayIds.map(renderOverlay)}
        {hasControlCenter(ctx) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={baseBtn}
                title={t('header.controlCenter')}
                aria-label={t('header.controlCenter')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1.5">
              <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                {t('header.controlCenter')}
              </div>
              {centerIds.map((id) => {
                const c = registry[id]
                return (
                  <button
                    key={id}
                    onClick={c.onClick}
                    className="flex w-full items-center gap-2.5 rounded-[var(--r-control)] px-2 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                  >
                    <c.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {selfCheckOpen && <SelfCheckPanel onClose={() => setSelfCheckOpen(false)} />}
      {briefOpen && <OpportunityBriefPanel onClose={() => setBriefOpen(false)} />}
      {mockOpen && <MockInterviewPanel onClose={() => setMockOpen(false)} />}
    </header>
  )
}
