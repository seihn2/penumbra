import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const CATEGORY_LABEL: Record<string, string> = {
  audio: '音频',
  screenshot: '截图',
  transcript: '转录',
  profile: '档案',
  prompt: '提问',
  other: '其他'
}

/** Data-egress capsule (P0#9): a small always-available indicator of what data
   has recently left the machine and to which domain. Polls the main-process
   egress log (metadata only — never payload content). */
export function EgressCapsule() {
  const { t } = useTranslation()
  const [egress, setEgress] = useState<Record<string, string[]>>({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      window.api.getActiveEgress().then((e) => {
        if (!cancelled) setEgress(e)
      })
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const domains = Object.keys(egress)
  if (domains.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tip flex h-8 items-center gap-1 rounded-[var(--r-control)] px-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-secondary)]"
        title={t('egress.title')}
        data-tip={t('egress.title')}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-xs">{domains.length}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-64 rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] p-3 text-xs text-[var(--text-secondary)] shadow-lg">
          <p className="mb-2 font-semibold text-[var(--text-primary)]">{t('egress.title')}</p>
          {domains.map((domain) => (
            <div key={domain} className="mb-1.5">
              <div className="text-[var(--text-primary)]">{domain}</div>
              <div className="text-[var(--text-tertiary)]">
                {egress[domain].map((c) => CATEGORY_LABEL[c] ?? c).join(' · ')}
              </div>
            </div>
          ))}
          <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">{t('egress.note')}</p>
        </div>
      )}
    </div>
  )
}
