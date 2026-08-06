import { useState } from 'react'
import { defaultCodingLanguages, normalizeCodingLanguageValue } from './language-options'

export function useCodingLanguages({
  onChange,
  close
}: {
  onChange?: (value: string) => void
  close: () => void
}) {
  const [languages, setLanguages] = useState(defaultCodingLanguages)

  const addCustomLanguage = (newLanguage: string) => {
    const trimmedLanguage = newLanguage.trim()
    if (!trimmedLanguage) return

    const newValue = normalizeCodingLanguageValue(trimmedLanguage)
    const exists = languages.some((language) => language.value === newValue)
    if (exists) return

    setLanguages((current) => [...current, { value: newValue, label: trimmedLanguage }])
    onChange?.(newValue)
    close()
  }

  return { languages, addCustomLanguage }
}
