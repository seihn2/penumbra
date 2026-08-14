import { useCoderPageState } from './hooks/useCoderPageState'
import { useTranscriptionController } from './hooks/useTranscriptionController'

import { AppHeader } from './AppHeader'
import { AppContent } from './AppContent'
import { AppStatusBar } from './AppStatusBar'
import { PrerequisitesChecker } from './PrerequisitesChecker'
import { InterviewCoachPanel } from './interview/InterviewCoachPanel'
import { HistoryPanel } from './HistoryPanel'

export default function CoderPage() {
  useCoderPageState()
  useTranscriptionController()

  return (
    <div className="relative flex h-screen flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <AppContent />
        <InterviewCoachPanel />
      </div>
      <AppStatusBar />
      <PrerequisitesChecker />
      <HistoryPanel />
    </div>
  )
}
