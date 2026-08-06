import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function PrerequisiteTextField({
  label,
  helper,
  value,
  placeholder,
  onChange,
  onSubmit
}: {
  label: string
  helper?: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onSubmit?: () => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        {label}{' '}
        {helper && (
          <span className="text-xs font-normal text-[var(--text-tertiary)]">({helper})</span>
        )}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) onSubmit?.()
        }}
        className="mt-1.5 w-full rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-border)]"
        placeholder={placeholder}
      />
    </div>
  )
}

export function PrerequisiteSecretField({
  value,
  visible,
  onChange,
  onVisibleChange,
  onSubmit
}: {
  value: string
  visible: boolean
  onChange: (value: string) => void
  onVisibleChange: (visible: boolean) => void
  onSubmit?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        {t('prerequisites.apiKey')}
      </label>
      <div className="mt-1.5 flex overflow-hidden rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-3)] focus-within:border-[var(--accent-border)]">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) onSubmit?.()
          }}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          placeholder={t('prerequisites.apiKeyPlaceholder')}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onVisibleChange(!visible)}
          className="h-9 w-9 rounded-none text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
        >
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
