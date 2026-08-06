import { describe, expect, it } from 'vitest'
import { friendlyConnectionError } from '../src/renderer/src/settings/connection-error'
import type { TFunction } from 'i18next'

// A stub t() that echoes the i18n key so we can assert on the mapped key.
const t = ((key: string) => key) as unknown as TFunction

describe('friendlyConnectionError', () => {
  it('returns the unknown key for an empty or missing raw error', () => {
    expect(friendlyConnectionError(t, '')).toBe('settings.connError.unknown')
    expect(friendlyConnectionError(t, undefined)).toBe('settings.connError.unknown')
  })

  it('maps timeout errors to the timeout key', () => {
    expect(friendlyConnectionError(t, 'Request timeout after 30s')).toBe(
      'settings.connError.timeout'
    )
    expect(friendlyConnectionError(t, 'Connection timeout')).toBe('settings.connError.timeout')
  })

  it('maps 401 / unauthorized / api key errors to the auth key', () => {
    expect(friendlyConnectionError(t, 'HTTP 401')).toBe('settings.connError.auth')
    expect(friendlyConnectionError(t, 'Unauthorized')).toBe('settings.connError.auth')
    expect(friendlyConnectionError(t, 'Invalid API key')).toBe('settings.connError.auth')
  })

  it('maps 403 errors to the forbidden key', () => {
    expect(friendlyConnectionError(t, 'HTTP 403 Forbidden')).toBe('settings.connError.forbidden')
  })

  it('maps 404 / not found errors to the notFound key', () => {
    expect(friendlyConnectionError(t, 'HTTP 404')).toBe('settings.connError.notFound')
    expect(friendlyConnectionError(t, 'Model not found')).toBe('settings.connError.notFound')
  })

  it('maps network errors to the network key', () => {
    expect(friendlyConnectionError(t, 'ECONNREFUSED')).toBe('settings.connError.network')
    expect(friendlyConnectionError(t, 'getaddrinfo ENOTFOUND api.example.com')).toBe(
      'settings.connError.network'
    )
    expect(friendlyConnectionError(t, 'network error')).toBe('settings.connError.network')
    expect(friendlyConnectionError(t, 'fetch failed')).toBe('settings.connError.network')
  })

  it('maps quota / billing errors to the quota key', () => {
    expect(friendlyConnectionError(t, 'Arrears')).toBe('settings.connError.quota')
    expect(friendlyConnectionError(t, 'quota exceeded')).toBe('settings.connError.quota')
    expect(friendlyConnectionError(t, 'insufficient balance')).toBe('settings.connError.quota')
    expect(friendlyConnectionError(t, '账户欠费')).toBe('settings.connError.quota')
  })

  it('is case-insensitive when matching', () => {
    expect(friendlyConnectionError(t, 'TIMEOUT')).toBe('settings.connError.timeout')
    expect(friendlyConnectionError(t, 'UNAUTHORIZED')).toBe('settings.connError.auth')
  })

  it('returns the raw string unchanged for an unrecognized error', () => {
    expect(friendlyConnectionError(t, 'something weird happened')).toBe('something weird happened')
  })
})
