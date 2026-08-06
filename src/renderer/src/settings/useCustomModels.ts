import { useMemo } from 'react'
import { useSettingValue, useUpdateSetting } from '@/lib/store/settings'
import { buildModelOptions } from './model-options'

export function useCustomModels({
  selectedValue,
  onChange,
  close,
  apiBaseURL,
  discoveredModels
}: {
  selectedValue?: string
  onChange?: (value: string) => void
  close: () => void
  apiBaseURL: string
  discoveredModels: string[]
}) {
  const customModels = useSettingValue('customModels')
  const updateSetting = useUpdateSetting()
  const models = useMemo(
    () => buildModelOptions(customModels, apiBaseURL, discoveredModels),
    [apiBaseURL, customModels, discoveredModels]
  )

  const addCustomModel = (newModel: string) => {
    const newValue = newModel.trim()
    if (!newValue) return

    const exists = models.some((model) => model.value === newValue)
    if (!exists) updateSetting('customModels', [...customModels, newValue])

    onChange?.(newValue)
    close()
  }

  const deleteCustomModel = (modelValue: string) => {
    updateSetting(
      'customModels',
      customModels.filter((model) => model !== modelValue)
    )

    if (selectedValue === modelValue) onChange?.('')
  }

  return { models, addCustomModel, deleteCustomModel }
}
