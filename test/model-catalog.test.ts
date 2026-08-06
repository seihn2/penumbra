import { describe, expect, it } from 'vitest'
import { API_BASE_URL_PRESETS } from '../src/shared/api-base-url-presets'
import {
  COMMON_MODELS_BY_PROVIDER,
  commonModelsFor,
  detectModelProvider,
  recommendedModelFor
} from '../src/shared/model-catalog'

describe('model catalog', () => {
  it('recognizes every built-in provider and gives it common models', () => {
    for (const preset of API_BASE_URL_PRESETS) {
      const provider = detectModelProvider(preset.url)
      expect(provider).not.toBe('custom')
      expect(commonModelsFor(preset.url).length).toBeGreaterThan(0)
    }
  })

  it('recognizes provider-specific endpoint variants', () => {
    expect(detectModelProvider('https://ark.cn-beijing.volces.com/api/coding/v3')).toBe(
      'volcengine'
    )
    expect(detectModelProvider('https://dashscope.aliyuncs.com/compatible-mode/v1/')).toBe(
      'dashscope'
    )
  })

  it('keeps model ids unique within each provider', () => {
    for (const models of Object.values(COMMON_MODELS_BY_PROVIDER)) {
      const ids = models.map((model) => model.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('falls back to OpenAI when the base URL is empty', () => {
    expect(detectModelProvider('')).toBe('openai')
    expect(commonModelsFor('')[0].id).toBe('gpt-5.6-sol')
  })

  it('returns each provider recommended model', () => {
    for (const preset of API_BASE_URL_PRESETS) {
      expect(recommendedModelFor(preset.url)?.recommended).toBe(true)
    }
  })

  it('keeps screenshot-capable recommendations marked as vision models', () => {
    expect(recommendedModelFor('https://api.minimaxi.com/v1')?.supportsVision).toBe(true)
    expect(recommendedModelFor('https://api.groq.com/openai/v1')?.supportsVision).toBe(true)
  })
})
