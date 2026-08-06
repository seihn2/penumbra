import { commonModelsFor } from '../../../shared/model-catalog'

export type ModelOptionSource = 'common' | 'account' | 'custom'

export type ModelOption = {
  value: string
  label: string
  isCustom: boolean
  source: ModelOptionSource
  supportsVision?: boolean
  recommended?: boolean
}

export const defaultModelOptions: ModelOption[] = commonModelsFor('').map((model) => ({
  value: model.id,
  label: model.id,
  isCustom: false,
  source: 'common',
  supportsVision: model.supportsVision,
  recommended: model.recommended
}))

export function buildModelOptions(
  customModels: string[],
  apiBaseURL = '',
  discoveredModels: string[] = []
): ModelOption[] {
  const commonItems = commonModelsFor(apiBaseURL).map((model) => ({
    value: model.id,
    label: model.id,
    isCustom: false,
    source: 'common' as const,
    supportsVision: model.supportsVision,
    recommended: model.recommended
  }))
  const commonValues = commonItems.map((model) => model.value)
  const accountItems = dedupeFetchedModels(discoveredModels, commonValues).map((model) => ({
    value: model,
    label: model,
    isCustom: false,
    source: 'account' as const
  }))
  const knownValues = [...commonValues, ...accountItems.map((model) => model.value)]
  const customItems = customModels
    .map((model) => model.trim())
    .filter(Boolean)
    .map((model) => ({
      value: model,
      label: model,
      isCustom: true,
      source: 'custom' as const
    }))

  const seen = new Set<string>()
  return [
    ...commonItems,
    ...accountItems,
    ...customItems.filter((model) => !knownValues.includes(model.value))
  ].filter((option) => {
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

/** Given the currently shown model option values and a list of fetched model
   ids, return the deduped, trimmed, non-empty ids that are not already shown.
   Pure helper so the "fetch platform models" merge is testable. */
export function dedupeFetchedModels(fetched: string[], known: Iterable<string>): string[] {
  const knownSet = new Set(known)
  return Array.from(new Set(fetched.map((m) => m.trim()).filter(Boolean))).filter(
    (m) => !knownSet.has(m)
  )
}
