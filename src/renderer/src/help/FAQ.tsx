import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { platformAlt } from '@/lib/utils/env'
import { getShortcutAcceleratorDisplay } from '@/lib/utils/keyboard'
import { HelpSection } from './components'

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const

// Display strings for the shortcuts referenced in answers (e.g. ⌥⏎).
function key(accelerator: string): string {
  return getShortcutAcceleratorDisplay(accelerator)
}

export function FAQ() {
  const { t } = useTranslation()

  const answers: Record<(typeof FAQ_KEYS)[number], string> = {
    q1: t('help.faq.a1', { key: key(`${platformAlt}+Enter`) }),
    q2: t('help.faq.a2', { key: key(`${platformAlt}+Shift+Enter`) }),
    q3: t('help.faq.a3'),
    q4: t('help.faq.a4', { key: key(`${platformAlt}+M`) }),
    q5: t('help.faq.a5', { key: key(`${platformAlt}+T`) }),
    q6: t('help.faq.a6', { key: key(`${platformAlt}+Shift+T`) }),
    q7: t('help.faq.a7'),
    q8: t('help.faq.a8'),
    q9: t('help.faq.a9'),
    q10: t('help.faq.a10')
  }

  return (
    <HelpSection Icon={BookOpen} title={t('help.faqTitle')}>
      {FAQ_KEYS.map((k) => (
        <div
          key={k}
          className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4"
        >
          <h3 className="mb-2 font-semibold text-[var(--text-primary)]">{t(`help.faq.${k}`)}</h3>
          <p className="text-sm leading-relaxed text-[var(--text-tertiary)]">{answers[k]}</p>
        </div>
      ))}
    </HelpSection>
  )
}
