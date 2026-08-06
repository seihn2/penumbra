import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  X,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  type LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SoakReport, SoakVerdict } from '../../../shared/soak-health'
import { useModalDismiss } from './hooks/useModalDismiss'

type Report = SoakReport & { sampling: boolean }

const VERDICT_TONE: Record<SoakVerdict, string> = {
  pass: 'text-emerald-400',
  degraded: 'text-amber-400',
  fail: 'text-red-400'
}

const VERDICT_ICON: Record<SoakVerdict, LucideIcon> = {
  pass: CheckCircle2,
  degraded: AlertTriangle,
  fail: XCircle
}

function VerdictIcon({ verdict }: { verdict: SoakVerdict }) {
  const Icon = VERDICT_ICON[verdict]
  return <Icon className={`h-4 w-4 ${VERDICT_TONE[verdict]}`} />
}

// Quality-benchmark / soak control panel (P2#46): start/stop the health sampler
// and read the evaluated pass/degraded/fail verdict. The 120-min capture runs on
// the real machine; this surfaces the verdict the pure evaluator produces.
export function SoakPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  const [report, setReport] = useState<Report | null>(null)

  const refresh = async () => setReport(await window.api.getSoakReport())

  useEffect(() => {
    refresh()
  }, [])

  const start = async () => {
    await window.api.startSoakSampling()
    await refresh()
  }
  const stop = async () => {
    await window.api.stopSoakSampling()
    await refresh()
  }

  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('soak.title')}
        className="m-auto w-[460px] rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] p-6 text-[var(--text-primary)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-lg font-semibold">{t('soak.title')}</h1>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
            aria-label={t('header.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--text-tertiary)]">{t('soak.intro')}</p>

        <div className="mb-4 flex items-center gap-2">
          {report?.sampling ? (
            <Button variant="outline" className="gap-1.5" onClick={stop}>
              <Square className="h-3.5 w-3.5" />
              {t('soak.stop')}
            </Button>
          ) : (
            <Button variant="outline" className="gap-1.5" onClick={start}>
              <Play className="h-3.5 w-3.5" />
              {t('soak.start')}
            </Button>
          )}
          <Button variant="ghost" className="gap-1.5" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('soak.refresh')}
          </Button>
          {report?.sampling && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t('soak.sampling')}
            </span>
          )}
        </div>

        {report && (
          <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-1.5 text-sm font-semibold ${VERDICT_TONE[report.verdict]}`}
              >
                <VerdictIcon verdict={report.verdict} />
                {t(`soak.verdict.${report.verdict}` as Parameters<typeof t>[0])}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {t('soak.samples', { count: report.samples })}
              </span>
            </div>
            {report.issues.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {report.issues.map((issue) => (
                  <li key={issue.code} className="flex items-start gap-1.5">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        issue.severity === 'error' ? 'bg-red-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-[var(--text-secondary)]">{issue.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
