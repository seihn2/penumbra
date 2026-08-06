import { describe, expect, it, beforeEach } from 'vitest'
import { useTranscriptionStore } from '../src/renderer/src/lib/store/transcription'
import {
  createInitialInterviewCoachState,
  type InterviewCoachState
} from '../src/shared/interview-coach'

// A coach state that clearly differs from the initial empty one, so we can tell
// whether a clear preserved or wiped it.
const populatedCoach = (): InterviewCoachState => ({
  ...createInitialInterviewCoachState(),
  interviewerTurns: 1,
  turns: [
    {
      id: 't1',
      speaker: 'interviewer',
      speakerSource: 'provider',
      text: '介绍一下你自己',
      isPartial: false,
      language: 'zh',
      timestamp: 1
    }
  ]
})

function seedActiveSession() {
  useTranscriptionStore.setState({
    transcriptionText: '面试官：介绍一下你自己',
    translations: [{ sourceText: 'a', translatedText: 'b', targetLanguage: 'en', timestamp: 1 }],
    interviewCoach: populatedCoach(),
    assists: [{ question: 'q', points: 'p', timestamp: 1 }],
    liveAssist: '正在思考',
    summary: '目前在做自我介绍',
    memoryCandidates: [{ field: 'techStack', text: 'Go' }]
  })
}

describe('transcription store: clearPendingText keeps the coaching session', () => {
  beforeEach(seedActiveSession)

  it('clears only the pending transcript text', () => {
    useTranscriptionStore.getState().clearPendingText()
    expect(useTranscriptionStore.getState().transcriptionText).toBe('')
  })

  it('preserves the coach timeline, assists, summary, translations, candidates', () => {
    useTranscriptionStore.getState().clearPendingText()
    const s = useTranscriptionStore.getState()
    expect(s.interviewCoach.turns).toHaveLength(1)
    expect(s.assists).toHaveLength(1)
    expect(s.summary).toBe('目前在做自我介绍')
    expect(s.translations).toHaveLength(1)
    expect(s.memoryCandidates).toHaveLength(1)
  })
})

describe('transcription store: clearText ends the whole session', () => {
  beforeEach(seedActiveSession)

  it('wipes transcript, timeline, assists, summary, translations, candidates', () => {
    useTranscriptionStore.getState().clearText()
    const s = useTranscriptionStore.getState()
    expect(s.transcriptionText).toBe('')
    expect(s.interviewCoach.turns).toHaveLength(0)
    expect(s.assists).toHaveLength(0)
    expect(s.summary).toBe('')
    expect(s.translations).toHaveLength(0)
    expect(s.memoryCandidates).toHaveLength(0)
  })
})
