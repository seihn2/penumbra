import { useState } from 'react'
import i18n from '@/lib/i18n'
import { useSolutionStore } from '@/lib/store/solution'
import { useChatStore } from '@/lib/store/chat'

export function useFollowUpQuestion() {
  const setIsLoading = useSolutionStore((state) => state.setIsLoading)
  const setErrorMessage = useSolutionStore((state) => state.setErrorMessage)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [questionInput, setQuestionInput] = useState('')

  const openDialog = () => {
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setQuestionInput('')
  }

  const submitQuestion = async () => {
    if (!questionInput.trim()) return

    setIsLoading(true)
    setIsDialogOpen(false)
    const question = questionInput.trim()
    setQuestionInput('')
    useChatStore.getState().addUserText(question)

    try {
      const result = await window.api.sendFollowUpQuestion(question)
      // Invalid state is reported via { success: false } rather than a throw,
      // so without this check loading would hang forever with no feedback.
      if (result && result.success === false) {
        setIsLoading(false)
        setErrorMessage(i18n.t('workbench.sendFailed'))
      }
    } catch (error) {
      console.error('Error sending follow-up question:', error)
      setIsLoading(false)
      setErrorMessage(i18n.t('workbench.sendFailed'))
    }
  }

  return {
    isDialogOpen,
    questionInput,
    setIsDialogOpen,
    setQuestionInput,
    openDialog,
    closeDialog,
    submitQuestion
  }
}
