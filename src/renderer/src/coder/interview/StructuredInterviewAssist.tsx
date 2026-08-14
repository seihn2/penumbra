import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BookOpenCheck,
  CornerDownRight,
  MessageCircleMore,
  Route,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { cn } from '@/lib/utils'
import {
  parseInterviewAssistPlan,
  type InterviewAssistKind
} from '../../../../shared/interview-assist-plan'

export function StructuredInterviewAssist({
  content,
  streaming = false,
  compact = false
}: {
  content: string
  streaming?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  const plan = parseInterviewAssistPlan(content)

  if (!plan.structured) {
    if (streaming && content.trim().startsWith('[')) {
      return <div className="coach-assist-loading">{t('coach.aiAssistLoading')}</div>
    }
    return (
      <div className="coach-assist-markdown">
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </div>
    )
  }

  const hasContent =
    plan.opening ||
    plan.path.length > 0 ||
    plan.evidence.length > 0 ||
    plan.followUps.length > 0 ||
    plan.avoid.length > 0

  return (
    <div className={cn('interview-assist', compact && 'is-compact')}>
      {plan.kind && <QuestionKind kind={plan.kind} />}

      {plan.opening && (
        <section className="interview-assist-opening">
          <div className="interview-assist-opening-label">
            <MessageCircleMore className="h-3.5 w-3.5" />
            {t('coach.assist.opening')}
          </div>
          <p>{plan.opening}</p>
        </section>
      )}

      <div className="interview-assist-grid">
        {plan.path.length > 0 && (
          <AssistSection icon={Route} label={t('coach.assist.path')} compact={compact}>
            <ol className="interview-assist-path">
              {plan.path.map((item, index) => (
                <li key={`${index}-${item}`}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </AssistSection>
        )}

        {plan.evidence.length > 0 && (
          <AssistSection icon={BookOpenCheck} label={t('coach.assist.evidence')} compact={compact}>
            <BulletList items={plan.evidence} tone="evidence" />
          </AssistSection>
        )}

        {plan.followUps.length > 0 && (
          <AssistSection
            icon={CornerDownRight}
            label={t('coach.assist.followUp')}
            compact={compact}
          >
            <BulletList items={plan.followUps} />
          </AssistSection>
        )}

        {plan.avoid.length > 0 && (
          <AssistSection icon={AlertTriangle} label={t('coach.assist.avoid')} compact={compact}>
            <BulletList items={plan.avoid} tone="warning" />
          </AssistSection>
        )}
      </div>

      {!hasContent && streaming && (
        <div className="coach-assist-loading">{t('coach.aiAssistLoading')}</div>
      )}
    </div>
  )
}

function QuestionKind({ kind }: { kind: InterviewAssistKind }) {
  const { t } = useTranslation()
  return (
    <div className="interview-assist-kind">
      <span>{t(`coach.assist.kind.${kind}`)}</span>
    </div>
  )
}

function AssistSection({
  icon: Icon,
  label,
  compact,
  children
}: {
  icon: LucideIcon
  label: string
  compact: boolean
  children: ReactNode
}) {
  return (
    <section className={cn('interview-assist-section', compact && 'is-compact')}>
      <div className="interview-assist-section-title">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </section>
  )
}

function BulletList({
  items,
  tone = 'default'
}: {
  items: string[]
  tone?: 'default' | 'evidence' | 'warning'
}) {
  return (
    <ul className="interview-assist-list">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>
          <span
            className={cn(
              'interview-assist-bullet',
              tone === 'evidence' && 'is-evidence',
              tone === 'warning' && 'is-warning'
            )}
          />
          <p>{item}</p>
        </li>
      ))}
    </ul>
  )
}
