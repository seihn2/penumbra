import { FollowUpDialog } from './FollowUpDialog'
import { StatusBarLeft } from './StatusBarLeft'
import { StatusBarRight } from './StatusBarRight'
import { useFollowUpQuestion } from './hooks/useFollowUpQuestion'
import { useStatusBarState } from './hooks/useStatusBarState'

export function AppStatusBar() {
  const { isReceivingSolution, hasActiveConversation, ignoreMouse, shortcuts, stopGeneration } =
    useStatusBarState()
  const {
    isDialogOpen,
    questionInput,
    setIsDialogOpen,
    setQuestionInput,
    openDialog,
    closeDialog,
    submitQuestion
  } = useFollowUpQuestion()

  return (
    <div className="workbench-statusbar">
      <div>
        <StatusBarLeft
          isReceivingSolution={isReceivingSolution}
          hasActiveConversation={hasActiveConversation}
          shortcuts={shortcuts}
          onStop={stopGeneration}
        />
      </div>
      <StatusBarRight
        hasActiveConversation={hasActiveConversation}
        isReceivingSolution={isReceivingSolution}
        ignoreMouse={ignoreMouse}
        shortcuts={shortcuts}
        onFollowUp={openDialog}
      />
      <FollowUpDialog
        open={isDialogOpen}
        questionInput={questionInput}
        onOpenChange={setIsDialogOpen}
        onQuestionChange={setQuestionInput}
        onCancel={closeDialog}
        onSubmit={submitQuestion}
      />
    </div>
  )
}
