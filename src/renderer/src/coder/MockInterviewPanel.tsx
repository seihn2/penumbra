import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GraduationCap, X, Loader2, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  askQuestion,
  createMockSession,
  difficultyLadder,
  followUp,
  nextTrackRotation,
  scoreAnswer,
  type Difficulty,
  type InterviewMode,
  type MockSession,
  type Track
} from '../../../shared/mock-interview'
import { pickBankQuestion } from '../../../shared/mock-question-bank'
import { useModalDismiss } from './hooks/useModalDismiss'

type Turn = {
  questionId: string
  prompt: string
  track: Track
  difficulty: Difficulty
  answer: string
  score: { total: number; shown: boolean; feedback: string } | null
}

const TRACKS: Track[] = ['behavioral', 'system-design', 'coding']

export function MockInterviewPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  useModalDismiss(onClose)
  const [mode, setMode] = useState<InterviewMode>('practice')
  const [track, setTrack] = useState<Track>('behavioral')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [session, setSession] = useState<MockSession | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const current = turns[turns.length - 1] ?? null
  const awaitingAnswer = current !== null && current.answer === ''

  const historyText = (): string =>
    turns.map((turn) => `Q: ${turn.prompt}${turn.answer ? `\nA: ${turn.answer}` : ''}`).join('\n\n')

  const appendQuestion = async (
    baseSession: MockSession,
    nextTrack: Track,
    nextDifficulty: Difficulty,
    isFollowUp: boolean
  ) => {
    setLoading(true)
    try {
      const aiPrompt = await window.api.generateMockQuestion({
        track: nextTrack,
        difficulty: nextDifficulty,
        history: historyText(),
        isFollowUp
      })
      const prompt = aiPrompt || pickBankQuestion(nextTrack, nextDifficulty, baseSession.seq)
      const next = isFollowUp
        ? followUp(baseSession, { prompt, difficulty: nextDifficulty })
        : askQuestion(baseSession, { track: nextTrack, difficulty: nextDifficulty, prompt })
      setSession(next)
      const asked = next.questions[next.questions.length - 1]
      setTurns((prev) => [
        ...prev,
        {
          questionId: asked.id,
          prompt,
          track: nextTrack,
          difficulty: nextDifficulty,
          answer: '',
          score: null
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const start = () => {
    const fresh = createMockSession(mode)
    setSession(fresh)
    setTurns([])
    setAnswer('')
    void appendQuestion(fresh, track, difficulty, false)
  }

  const submitAnswer = async () => {
    if (!session || !current || !answer.trim()) return
    setLoading(true)
    try {
      const raw = await window.api.scoreMockAnswer({ question: current.prompt, answer })
      const scored = raw ? { ...scoreAnswer(raw, mode), feedback: raw.feedback } : null
      const answeredText = answer
      // A "went well" step-up when the shown/computed total is >= 3.
      const wentWell = (raw ? scoreAnswer(raw, mode).total : 3) >= 3
      setTurns((prev) =>
        prev.map((turn) =>
          turn.questionId === current.questionId
            ? { ...turn, answer: answeredText, score: scored }
            : turn
        )
      )
      setAnswer('')
      const nextDifficulty = difficultyLadder(current.difficulty, wentWell)
      const nextTrack = nextTrackRotation(current.track)
      setDifficulty(nextDifficulty)
      setTrack(nextTrack)
      // Alternate: drill down on the same track sometimes, else rotate track.
      const isFollowUp = turns.length % 2 === 0
      await appendQuestion(
        session,
        isFollowUp ? current.track : nextTrack,
        nextDifficulty,
        isFollowUp
      )
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSession(null)
    setTurns([])
    setAnswer('')
  }

  return (
    <div className="fixed inset-0 top-9 z-50 flex bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('mock.title')}
        className="m-auto flex h-[82vh] w-[560px] flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-primary)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-sm font-semibold">{t('mock.title')}</h1>
          </div>
          <div className="flex items-center gap-1">
            {session && (
              <button
                onClick={reset}
                title={t('mock.reset')}
                aria-label={t('mock.reset')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label={t('header.close')}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!session ? (
          <div className="space-y-4 p-5">
            <p className="text-xs text-[var(--text-tertiary)]">{t('mock.intro')}</p>
            <Segmented
              label={t('mock.mode')}
              value={mode}
              options={[
                { value: 'practice', label: t('mock.modePractice') },
                { value: 'formal', label: t('mock.modeFormal') }
              ]}
              onChange={(v) => setMode(v as InterviewMode)}
            />
            <Segmented
              label={t('mock.track')}
              value={track}
              options={TRACKS.map((tr) => ({ value: tr, label: t(`mock.track_${tr}`) }))}
              onChange={(v) => setTrack(v as Track)}
            />
            <Segmented
              label={t('mock.difficulty')}
              value={difficulty}
              options={[
                { value: 'easy', label: t('mock.diff_easy') },
                { value: 'medium', label: t('mock.diff_medium') },
                { value: 'hard', label: t('mock.diff_hard') }
              ]}
              onChange={(v) => setDifficulty(v as Difficulty)}
            />
            <Button className="w-full" onClick={start}>
              {t('mock.start')}
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {turns.map((turn, i) => (
                <div key={turn.questionId} className="space-y-2">
                  <div className="rounded-[var(--r-control)] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 text-sm">
                    <div className="mb-1 text-[10px] uppercase text-[var(--accent)]">
                      {t(`mock.track_${turn.track}`)} · {t(`mock.diff_${turn.difficulty}`)} ·{' '}
                      {t('mock.qIndex', { n: i + 1 })}
                    </div>
                    {turn.prompt}
                  </div>
                  {turn.answer && (
                    <div className="rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-secondary)]">
                      {turn.answer}
                      {turn.score && turn.score.shown && (
                        <div className="mt-2 border-t border-[var(--hairline)] pt-2 text-xs">
                          <span className="font-semibold text-[var(--accent)]">
                            {t('mock.score', { total: turn.score.total })}
                          </span>
                          {turn.score.feedback && (
                            <span className="ml-2 text-[var(--text-tertiary)]">
                              {turn.score.feedback}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('mock.thinking')}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-[var(--hairline)] p-4">
              <textarea
                className="brief-input mb-2"
                rows={3}
                placeholder={t('mock.answerPlaceholder')}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!awaitingAnswer || loading}
              />
              <Button
                className="w-full"
                onClick={submitAnswer}
                disabled={!awaitingAnswer || loading || !answer.trim()}
              >
                {t('mock.submit')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Segmented({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={
              value === opt.value
                ? 'flex-1 rounded-[var(--r-control)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-1.5 text-xs text-[var(--accent)]'
                : 'flex-1 rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
