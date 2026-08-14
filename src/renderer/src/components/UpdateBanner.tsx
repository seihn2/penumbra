import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, X } from 'lucide-react'

type UpdateStage = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

/** In-app auto-update prompt. Lives inside the renderer so it's covered by
   setContentProtection and never appears in a screen share (unlike the native
   dialog it replaces). Windows/Linux only — macOS auto-update is disabled. */
export function UpdateBanner() {
  const { t } = useTranslation()
  const [stage, setStage] = useState<UpdateStage>('idle')
  const [version, setVersion] = useState<string>('')
  const [percent, setPercent] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    window.api.onUpdateAvailable((payload) => {
      setVersion(payload?.version ?? '')
      setStage('available')
      setDismissed(false)
    })
    window.api.onUpdateProgress((payload) => {
      setPercent(payload?.percent ?? 0)
      setStage('downloading')
    })
    window.api.onUpdateDownloaded(() => setStage('downloaded'))
    window.api.onUpdateError(() => setStage('error'))
    return () => window.api.removeUpdateListeners()
  }, [])

  if (stage === 'idle' || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[340px] max-w-[calc(100vw-2rem)] rounded-[var(--r-card)] border border-[var(--accent-border)] bg-[var(--surface-1)] p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
          {stage === 'downloading' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {stage === 'available' && (
            <>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {version ? t('update.availableVersion', { version }) : t('update.available')}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.api.downloadUpdate()}
                  className="rounded-[var(--r-pill)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  {t('update.download')}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded-[var(--r-pill)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)]"
                >
                  {t('update.later')}
                </button>
              </div>
            </>
          )}
          {stage === 'downloading' && (
            <>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {t('update.downloading', { percent })}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-fill)] transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </>
          )}
          {stage === 'downloaded' && (
            <>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {t('update.ready')}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.api.installUpdate()}
                  className="rounded-[var(--r-pill)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  {t('update.restart')}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded-[var(--r-pill)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)]"
                >
                  {t('update.later')}
                </button>
              </div>
            </>
          )}
          {stage === 'error' && (
            <div className="text-sm text-[var(--text-secondary)]">{t('update.error')}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          aria-label={t('update.later')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
