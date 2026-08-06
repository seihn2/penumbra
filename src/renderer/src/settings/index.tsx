import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  MessageSquareText,
  Mic,
  Languages,
  BriefcaseBusiness,
  SlidersHorizontal,
  Keyboard,
  FolderOpen,
  Shield,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isMac } from '@/lib/utils/env'
import { AppearanceSettingsSection } from './AppearanceSettingsSection'
import { MemorySettingsSection } from './MemorySettingsSection'
import { ModelSettingsSection } from './ModelSettingsSection'
import { PrivacySettingsSection } from './PrivacySettingsSection'
import { ShortcutsSettingsSection } from './ShortcutsSettingsSection'
import { StorageSettingsSection } from './StorageSettingsSection'
import { StrategySettingsSection } from './StrategySettingsSection'
import { VoiceSettingsSection } from './VoiceSettingsSection'

interface SettingsTab {
  id: string
  icon: LucideIcon
  labelKey: string
  Section: () => React.JSX.Element
}

const TABS: SettingsTab[] = [
  {
    id: 'model',
    icon: MessageSquareText,
    labelKey: 'settings.model.title',
    Section: ModelSettingsSection
  },
  { id: 'voice', icon: Mic, labelKey: 'settings.voice.title', Section: VoiceSettingsSection },
  {
    id: 'strategy',
    icon: Languages,
    labelKey: 'settings.strategy.title',
    Section: StrategySettingsSection
  },
  {
    id: 'memory',
    icon: BriefcaseBusiness,
    labelKey: 'settings.memory.title',
    Section: MemorySettingsSection
  },
  {
    id: 'appearance',
    icon: SlidersHorizontal,
    labelKey: 'settings.appearance.title',
    Section: AppearanceSettingsSection
  },
  {
    id: 'shortcuts',
    icon: Keyboard,
    labelKey: 'settings.shortcuts.title',
    Section: ShortcutsSettingsSection
  },
  {
    id: 'storage',
    icon: FolderOpen,
    labelKey: 'settings.storage.title',
    Section: StorageSettingsSection
  },
  {
    id: 'privacy',
    icon: Shield,
    labelKey: 'settings.privacy.title',
    Section: PrivacySettingsSection
  }
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState(TABS[0].id)
  const ActiveSection = (TABS.find((tab) => tab.id === activeId) ?? TABS[0]).Section

  return (
    <>
      <div id="app-header" className="flex items-center justify-between">
        <div className={`actions ${isMac ? 'pl-[78px]' : 'pl-2'}`}>
          <Button
            variant="ghost"
            asChild
            size="icon"
            className="h-9 w-9 rounded-[var(--r-control)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          >
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-wide">
          {t('settings.title')}
        </div>
        <div className="w-12" />
      </div>

      <main id="app-content" className="settings-shell">
        <div className="mx-auto flex w-full max-w-[920px] gap-5 px-5 py-4">
          {/* Left vertical tab rail */}
          <nav className="flex w-44 shrink-0 flex-col gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = tab.id === activeId
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveId(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-[var(--r-control)] px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(tab.labelKey)}</span>
                </button>
              )
            })}
          </nav>

          {/* Right content area */}
          <div className="min-w-0 flex-1">
            <ActiveSection />
          </div>
        </div>
      </main>
    </>
  )
}
