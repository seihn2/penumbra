import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useModalDismiss } from './hooks/useModalDismiss'
import type { CheckResult, SelfCheckVerdict } from '../../../shared/self-check'

const CHECK_ORDER = ['ai', 'network', 'screenshot', 'asr', 'shortcuts', 'dependencies'] as const

function StatusIcon({ status }: { status: CheckResult['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (status === 'fail') return <XCircle className="h-4 w-4 text-red-400" />
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  return <MinusCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
}

export function SelfCheckPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  const [running, setRunning] = useState(false)
  const [checks, setChecks] = useState<CheckResult[] | null>(null)
  const [verdict, setVerdict] = useState<SelfCheckVerdict | null>(null)

  const run = async () => {
    setRunning(true)
    try {
      const result = await window.api.runSelfCheck()
      setChecks(result.checks)
      setVerdict(result.verdict)
    } finally {
      setRunning(false)
    }
  }

  const byId = new Map((checks ?? []).map((c) => [c.id, c]))
  const ordered = CHECK_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)!)

  const verdictTone =
    verdict?.readiness === 'ready'
      ? 'text-emerald-400'
      : verdict?.readiness === 'degraded'
        ? 'text-amber-400'
        : 'text-red-400'

  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('selfCheck.title')}
        className="m-auto w-[460px] rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] p-6 text-[var(--text-primary)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t('selfCheck.title')}</h1>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
            aria-label={t('header.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--text-tertiary)]">{t('selfCheck.intro')}</p>

        {checks && (
          <div className="mb-4 space-y-2">
            {ordered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <StatusIcon status={c.status} />
                <span className="flex-1 text-[var(--text-secondary)]">
                  {t(`selfCheck.checks.${c.id}`)}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {t(`selfCheck.status.${c.status}`)}
                </span>
              </div>
            ))}
          </div>
        )}

        {verdict && (
          <div className="mb-4 rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
            <div className={`text-sm font-semibold ${verdictTone}`}>
              {t(`selfCheck.readiness.${verdict.readiness}`)}
            </div>
            {verdict.blockingCheckId && (
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                {t('selfCheck.blocking', {
                  item: t(`selfCheck.checks.${verdict.blockingCheckId}`)
                })}
              </div>
            )}
          </div>
        )}

        <Button className="w-full" onClick={run} disabled={running}>
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('selfCheck.running')}
            </>
          ) : (
            t(checks ? 'selfCheck.rerun' : 'selfCheck.run')
          )}
        </Button>
      </div>
    </div>
  )
}
