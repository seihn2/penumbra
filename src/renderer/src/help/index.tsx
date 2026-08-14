import { Link } from 'react-router'
import {
  ArrowLeft,
  Lightbulb,
  MessageCircle,
  Camera,
  PictureInPicture2,
  EyeOff,
  Info,
  Mic
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingValue } from '@/lib/store/settings'
import { isMac } from '@/lib/utils/env'
import { useTranslation } from 'react-i18next'
import { HelpSection } from './components'
import { Shortcuts } from './Shortcuts'
import { FAQ } from './FAQ'

export default function HelpPage() {
  const { t } = useTranslation()
  const trafficLightMode = useSettingValue('trafficLightMode')
  return (
    <>
      {/* Header */}
      <div id="app-header" className="flex items-center justify-between">
        <div className={`actions ${isMac && trafficLightMode !== 'hidden' ? 'pl-[78px]' : 'pl-2'}`}>
          <Button
            variant="ghost"
            asChild
            size="icon"
            className="h-9 w-9 rounded-[var(--r-control)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          >
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-wide">
          {t('help.title')}
        </div>
        <div className="w-12" />
      </div>

      {/* Help Content */}
      <main id="app-content" className="settings-shell">
        <section className="settings-hero">
          <div>
            <h1 className="workbench-title">{t('help.heroTitle')}</h1>
          </div>
          <div className="workbench-status-pill">{t('help.practiceMode')}</div>
        </section>

        <div className="flex flex-col gap-4">
          {/* Introduction */}
          <HelpSection Icon={Info} title={t('help.introTitle')}>
            <p>
              {t('help.introBefore')}
              <a
                href="https://github.com/seihn2/penumbra/wiki"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:brightness-125"
              >
                GitHub Wiki
              </a>
              {t('help.introAfter')}
            </p>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-3 font-semibold text-[var(--text-primary)]">
                {t('help.keyFeatures')}
              </h3>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{t('help.feature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{t('help.feature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <PictureInPicture2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{t('help.feature3')}</span>
                </li>
              </ul>
            </div>
          </HelpSection>

          {/* Quick Start */}
          <HelpSection Icon={Lightbulb} title={t('help.quickStart')}>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                {t('help.step1Title')}
              </h3>
              <p className="text-[var(--text-tertiary)]">{t('help.step1Desc')}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                {t('help.step2Title')}
              </h3>
              <p className="text-[var(--text-tertiary)]">{t('help.step2Desc')}</p>
            </div>
          </HelpSection>

          {/* Live Voice Interview (ASR) */}
          <HelpSection Icon={Mic} title={t('help.asrTitle')} description={t('help.asrDesc')}>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                {t('help.asrStep1Title')}
              </h3>
              <p className="text-[var(--text-tertiary)]">{t('help.asrStep1Desc')}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                {t('help.asrStep2Title')}
              </h3>
              <p className="text-[var(--text-tertiary)]">{t('help.asrStep2Desc')}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                {t('help.asrStep3Title')}
              </h3>
              <p className="text-[var(--text-tertiary)]">{t('help.asrStep3Desc')}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                {t('help.asrStep4Title')}
              </h3>
              <p className="text-[var(--text-tertiary)]">{t('help.asrStep4Desc')}</p>
            </div>
          </HelpSection>

          {/* Keyboard Shortcuts */}
          <Shortcuts />

          {/* FAQ */}
          <FAQ />

          {/* Contact Support */}
          <HelpSection Icon={MessageCircle} title={t('help.contactTitle')}>
            <p>{t('help.contactDesc')}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
                <h3 className="mb-2 font-semibold text-[var(--text-primary)]">GitHub Issues</h3>
                <p className="text-[var(--text-tertiary)]">
                  {t('help.contactGithubPrefix')}
                  <a
                    href="https://github.com/seihn2/penumbra/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:brightness-125"
                  >
                    GitHub Issues
                  </a>
                  {t('help.contactGithubSuffix')}
                </p>
              </div>
            </div>
          </HelpSection>
        </div>
      </main>
    </>
  )
}
