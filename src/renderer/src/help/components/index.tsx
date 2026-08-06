import { LucideIcon } from 'lucide-react'

export function HelpSection({
  Icon,
  title,
  description,
  children
}: {
  Icon: LucideIcon
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="settings-card">
      <div className="mb-5 flex items-start gap-3 border-b border-[var(--hairline)] pb-4">
        <span className="settings-card-icon">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-tertiary)]">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4 text-sm text-[var(--text-secondary)]">{children}</div>
    </section>
  )
}
