import { cn } from '@renderer/lib/utils'
import { getShortcutAcceleratorDisplay } from '@/lib/utils/keyboard'

export default function ShortcutRenderer({
  shortcut,
  className
}: {
  shortcut: string
  className?: string
}) {
  const keys = getShortcutAcceleratorDisplay(shortcut).split('+')
  return (
    <span
      className={cn(
        'rounded-[var(--r-sm)] border border-[var(--hairline)] bg-[var(--surface-3)] px-2 py-1 text-sm font-medium text-[var(--text-secondary)] transition-colors space-x-1',
        className
      )}
    >
      {keys.map((key) => (
        <span key={key}>{key}</span>
      ))}
    </span>
  )
}
