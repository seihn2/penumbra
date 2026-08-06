import type { TFunction } from 'i18next'

/** Map a raw connection-probe error into a friendly, localized message.
   Falls back to the raw string for anything we don't specifically handle. */
export function friendlyConnectionError(t: TFunction, raw?: string): string {
  const error = (raw ?? '').toLowerCase()
  if (!error) return t('settings.connError.unknown')
  if (error.includes('timeout')) return t('settings.connError.timeout')
  if (error.includes('401') || error.includes('unauthorized') || error.includes('api key')) {
    return t('settings.connError.auth')
  }
  if (error.includes('403')) return t('settings.connError.forbidden')
  if (error.includes('404') || error.includes('not found')) return t('settings.connError.notFound')
  if (
    error.includes('enotfound') ||
    error.includes('econnrefused') ||
    error.includes('network') ||
    error.includes('fetch failed')
  ) {
    return t('settings.connError.network')
  }
  if (
    error.includes('arrears') ||
    error.includes('quota') ||
    error.includes('balance') ||
    error.includes('insufficient') ||
    error.includes('欠费') ||
    error.includes('额度') ||
    error.includes('余额')
  ) {
    return t('settings.connError.quota')
  }
  return raw ?? t('settings.connError.unknown')
}
