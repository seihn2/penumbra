import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function FollowUpDialog({
  open,
  questionInput,
  onOpenChange,
  onQuestionChange,
  onCancel,
  onSubmit
}: {
  open: boolean
  questionInput: string
  onOpenChange: (open: boolean) => void
  onQuestionChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">{t('statusBar.askFollowUp')}</DialogTitle>
      <DialogContent>
        <div className="py-4">
          <Textarea
            placeholder={t('followUp.placeholder')}
            value={questionInput}
            className="min-h-24"
            onChange={(event) => onQuestionChange(event.target.value)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                onSubmit()
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('followUp.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={!questionInput.trim()}>
            {t('followUp.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
