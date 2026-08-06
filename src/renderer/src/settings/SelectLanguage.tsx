import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { useCodingLanguages } from './useCodingLanguages'

export function SelectLanguage({
  value,
  onChange,
  disabled,
  className
}: {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { t } = useTranslation()
  const close = () => {
    setSearchValue('')
    setOpen(false)
  }
  const { languages, addCustomLanguage } = useCodingLanguages({ onChange, close })

  const filteredLanguages = languages.filter((language) =>
    language.label.toLowerCase().includes(searchValue.toLowerCase())
  )

  const showCreateOption =
    searchValue &&
    !filteredLanguages.some((lang) => lang.label.toLowerCase() === searchValue.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-60 justify-between', className)}
        >
          {value
            ? (languages.find((language) => language.value === value)?.label ?? value)
            : t('settings.strategy.langSelect')}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput
            placeholder={t('settings.strategy.langSearch')}
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>{t('settings.strategy.langNoResult')}</CommandEmpty>
            <CommandGroup>
              {filteredLanguages.map((language) => (
                <CommandItem
                  key={language.value}
                  value={language.value}
                  onSelect={(currentValue) => {
                    onChange?.(currentValue === value ? '' : currentValue)
                    close()
                  }}
                >
                  {language.label}
                  <Check
                    className={cn(
                      'ml-auto',
                      value === language.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  value={`create-${searchValue}`}
                  onSelect={() => addCustomLanguage(searchValue)}
                  className="!text-[var(--accent)]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('settings.strategy.langCreate', { name: searchValue })}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
