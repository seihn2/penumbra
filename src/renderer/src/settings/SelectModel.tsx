import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronsUpDown, Check, Plus, X, RefreshCw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { useCustomModels } from './useCustomModels'
import type { ModelOption, ModelOptionSource } from './model-options'

export function SelectModel({
  value,
  onChange,
  disabled,
  className,
  apiBaseURL,
  discoveredModels,
  fetchingModels,
  canRefresh,
  onRefresh
}: {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  apiBaseURL: string
  discoveredModels: string[]
  fetchingModels: boolean
  canRefresh: boolean
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { t } = useTranslation()
  const close = () => {
    setSearchValue('')
    setOpen(false)
  }
  const { models, addCustomModel, deleteCustomModel } = useCustomModels({
    selectedValue: value,
    onChange,
    close,
    apiBaseURL,
    discoveredModels
  })

  const filtered = models.filter((m) => m.label.toLowerCase().includes(searchValue.toLowerCase()))
  const showCreate =
    searchValue && !filtered.some((m) => m.label.toLowerCase() === searchValue.toLowerCase())
  const grouped = (source: ModelOptionSource) => filtered.filter((model) => model.source === source)

  const renderModel = (model: ModelOption) => (
    <div key={model.value} className="group flex min-w-0 items-center">
      <CommandItem
        value={model.value}
        onSelect={(current) => {
          onChange?.(current === value ? '' : current)
          close()
        }}
        className="min-w-0 flex-1"
      >
        <span className="min-w-0 flex-1 truncate">{model.label}</span>
        {model.recommended && (
          <span className="ml-1 shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-300">
            {t('settings.model.recommendedTag')}
          </span>
        )}
        {model.supportsVision === true && (
          <span className="ml-1 shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
            {t('settings.model.visionTag')}
          </span>
        )}
        {model.supportsVision === false && (
          <span className="ml-1 shrink-0 rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
            {t('settings.model.textOnlyTag')}
          </span>
        )}
        {model.isCustom && (
          <span className="ml-1 shrink-0 rounded bg-violet-400/15 px-1.5 py-0.5 text-[10px] text-violet-300">
            {t('settings.model.customTag')}
          </span>
        )}
        <Check className={cn('ml-1', value === model.value ? 'opacity-100' : 'opacity-0')} />
      </CommandItem>
      {model.isCustom && (
        <button
          className="mr-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-red-400 group-hover:flex"
          title={t('settings.model.deleteCustom')}
          aria-label={t('settings.model.deleteCustom')}
          onClick={() => deleteCustomModel(model.value)}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full max-w-[420px] justify-between', className)}
        >
          <span className="min-w-0 truncate text-left">
            {value
              ? (models.find((m) => m.value === value)?.label ?? value)
              : t('settings.model.selectModel')}
          </span>
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-0">
        <Command>
          <div className="flex items-center gap-1 pr-1">
            <CommandInput
              placeholder={t('settings.model.searchOrCreate')}
              className="h-9 flex-1"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <button
              type="button"
              onClick={onRefresh}
              disabled={fetchingModels || !canRefresh}
              title={t('settings.model.refresh')}
              aria-label={t('settings.model.refresh')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', fetchingModels && 'animate-spin')} />
            </button>
          </div>
          <CommandList>
            <CommandEmpty>{t('settings.model.noResult')}</CommandEmpty>
            {grouped('common').length > 0 && (
              <CommandGroup heading={t('settings.model.commonGroup')}>
                {grouped('common').map(renderModel)}
              </CommandGroup>
            )}
            {grouped('account').length > 0 && (
              <CommandGroup heading={t('settings.model.accountGroup')}>
                {grouped('account').map(renderModel)}
              </CommandGroup>
            )}
            {(grouped('custom').length > 0 || showCreate) && (
              <CommandGroup heading={t('settings.model.customGroup')}>
                {grouped('custom').map(renderModel)}
                {showCreate && (
                  <CommandItem
                    value={`create-${searchValue}`}
                    onSelect={() => addCustomModel(searchValue)}
                    className="!text-[var(--accent)]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('settings.model.create', { name: searchValue })}
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
