import { Keyboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useShortcuts } from '@/lib/store/shortcuts'
import { shortcutCategories, shortcutMetadataByAction } from '@/lib/shortcut-metadata'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { HelpSection } from './components'

export function Shortcuts() {
  const { t } = useTranslation()
  return (
    <HelpSection
      Icon={Keyboard}
      title={t('help.shortcutsTitle')}
      description={t('help.shortcutsDesc')}
    >
      {shortcutCategories.map((category) => (
        <ShortcutItemGroup key={category.id} category={category.id} label={category.label} />
      ))}
    </HelpSection>
  )
}

function ShortcutItemGroup({ category, label }: { category: string; label: string }) {
  const { t } = useTranslation()
  const shortcuts = useShortcuts()
  return (
    <div className="space-y-2">
      <h3 className="text-sm text-[var(--text-tertiary)]">
        {t(`shortcutCategory.${category}`, label)}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(shortcuts)
          .filter((shortcut) => shortcut.category === category)
          .map((shortcut, index) => (
            <ShortcutItem key={index} action={shortcut.action} shortcutKey={shortcut.key} />
          ))}
      </div>
    </div>
  )
}

function ShortcutItem({ action, shortcutKey }: { action: string; shortcutKey: string }) {
  const { t } = useTranslation()
  const labelKey = shortcutMetadataByAction[action]?.label
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-2">
      <span className="text-sm text-[var(--text-secondary)]">
        {labelKey ? t(labelKey) : action}
      </span>
      <ShortcutRenderer shortcut={shortcutKey} className="select-none" />
    </div>
  )
}
