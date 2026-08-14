import { useCoderPageState } from './hooks/useCoderPageState'
import { useTranscriptionController } from './hooks/useTranscriptionController'

import { AppHeader } from './AppHeader'
import { AppContent } from './AppContent'
import { AppStatusBar } from './AppStatusBar'
import { PrerequisitesChecker } from './PrerequisitesChecker'
import { InterviewCoachPanel } from './interview/InterviewCoachPanel'
import { HistoryPanel } from './HistoryPanel'
import { useSettingValue } from '@/lib/store/settings'

export default function CoderPage() {
  useCoderPageState()
  useTranscriptionController()
  const zeroUiMode = useSettingValue('zeroUiMode')

  return (
    <div className={`relative flex h-screen flex-col ${zeroUiMode ? 'zero-ui-page' : ''}`}>
      {!zeroUiMode && <AppHeader />}
      <div className="flex min-h-0 flex-1">
        <AppContent zeroUiMode={zeroUiMode} />
        {!zeroUiMode && <InterviewCoachPanel />}
      </div>
      {!zeroUiMode && <AppStatusBar />}
      {!zeroUiMode && <PrerequisitesChecker />}
      {!zeroUiMode && <HistoryPanel />}
    </div>
  )
}
