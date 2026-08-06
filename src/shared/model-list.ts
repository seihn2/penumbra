const modelIdKeys = ['id', 'model', 'model_id', 'name'] as const
const collectionKeys = ['data', 'models', 'items', 'result'] as const

function normalizeModelId(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith('models/') ? trimmed.slice('models/'.length) : trimmed
}

function collectModelIds(value: unknown, output: string[], depth: number): void {
  if (depth > 4 || value == null) return

  if (typeof value === 'string') {
    const modelId = normalizeModelId(value)
    if (modelId) output.push(modelId)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) collectModelIds(item, output, depth + 1)
    return
  }

  if (typeof value !== 'object') return
  const record = value as Record<string, unknown>
  const directId = modelIdKeys.map((key) => record[key]).find((item) => typeof item === 'string')
  if (typeof directId === 'string') {
    const modelId = normalizeModelId(directId)
    if (modelId) output.push(modelId)
    return
  }

  for (const key of collectionKeys) {
    if (key in record) collectModelIds(record[key], output, depth + 1)
  }
}

export function extractModelIds(payload: unknown): string[] {
  const modelIds: string[] = []
  collectModelIds(payload, modelIds, 0)
  return Array.from(new Set(modelIds)).sort((left, right) => left.localeCompare(right))
}
