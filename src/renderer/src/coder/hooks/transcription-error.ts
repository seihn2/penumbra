import type { TFunction } from 'i18next'

/** Map a raw transcription/translation error into a friendly, localized message.
   Falls back to the raw string for anything we don't specifically handle. */
export function friendlyTranscriptionError(t: TFunction, raw?: string): string {
  const error = (raw ?? '').toLowerCase()
  if (!error) return raw ?? ''
  if (error.includes('断开') || error.includes('disconnect')) {
    return t('transcription.errDisconnected')
  }
  if (error.includes('翻译') || error.includes('translat')) {
    return t('transcription.errTranslate')
  }
  if (error.includes('超时') || error.includes('timeout')) {
    return t('transcription.errTimeout')
  }
  // Auth failures: invalid/expired DashScope key, unauthorized, forbidden.
  if (
    error.includes('apikey') ||
    error.includes('api key') ||
    error.includes('invalidapikey') ||
    error.includes('unauthorized') ||
    error.includes('authentication') ||
    error.includes('forbidden') ||
    error.includes('鉴权') ||
    error.includes('401') ||
    error.includes('403')
  ) {
    return t('transcription.errAuth')
  }
  // Quota / billing problems: arrears, insufficient balance, throttling/limit.
  if (
    error.includes('arrears') ||
    error.includes('quota') ||
    error.includes('balance') ||
    error.includes('insufficient') ||
    error.includes('limit') ||
    error.includes('欠费') ||
    error.includes('额度') ||
    error.includes('余额')
  ) {
    return t('transcription.errQuota')
  }
  return raw ?? ''
}

/** Whether an error-banner message originated from the transcription pipeline
   rather than AI solving. The banner's generic "重试" button re-runs the last
   *solution* (retryLastSolution), which is misleading for an ASR disconnect —
   so the UI offers a "restart transcription" action instead when this is true.
   Compares against the localized strings via the same `t`, so it stays correct
   across UI languages. */
export function isTranscriptionError(t: TFunction, message: string | null | undefined): boolean {
  if (!message) return false
  const known = [
    t('transcription.errDisconnected'),
    t('transcription.errTranslate'),
    t('transcription.errTimeout'),
    t('transcription.errAuth'),
    t('transcription.errQuota'),
    t('transcription.noKey')
  ]
  if (known.includes(message)) return true
  // startFailed is interpolated ("启动失败（…）"); match on its stable prefix.
  const startFailedPrefix = t('transcription.startFailed')
  return startFailedPrefix.length > 0 && message.startsWith(startFailedPrefix)
}
