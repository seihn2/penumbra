import { describe, expect, it } from 'vitest'
import { API_BASE_URL_PRESETS } from '../src/shared/api-base-url-presets'

describe('API_BASE_URL_PRESETS', () => {
  it('has presets with non-empty labels and https URLs', () => {
    expect(API_BASE_URL_PRESETS.length).toBeGreaterThan(0)
    for (const p of API_BASE_URL_PRESETS) {
      expect(p.label.trim().length).toBeGreaterThan(0)
      expect(p.url).toMatch(/^https:\/\/.+/)
    }
  })

  it('has unique URLs', () => {
    const urls = API_BASE_URL_PRESETS.map((p) => p.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
