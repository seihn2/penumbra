import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  createInitialInterviewCoachState,
  type InterviewCoachState
} from '../../../../shared/interview-coach'

export interface TranslationItem {
  sourceText: string
  translatedText: string
  targetLanguage: string
  timestamp: number
}

export interface AssistItem {
  question: string
  points: string
  timestamp: number
}

export interface MemoryCandidateItem {
  field: string
  text: string
}

interface TranscriptionState {
  isTranscribing: boolean
  transcriptionText: string
  translations: TranslationItem[]
  interviewCoach: InterviewCoachState
  assists: AssistItem[]
  assistLoading: boolean
  liveAssist: string
  summary: string
  memoryCandidates: MemoryCandidateItem[]
  errorMessage: string | null
}

interface TranscriptionStore extends TranscriptionState {
  setIsTranscribing: (v: boolean) => void
  setTranscriptionText: (text: string) => void
  addTranslation: (item: TranslationItem) => void
  setInterviewCoach: (state: InterviewCoachState) => void
  setAssistLoading: (v: boolean) => void
  setLiveAssist: (text: string) => void
  addAssist: (item: AssistItem) => void
  setSummary: (summary: string) => void
  addMemoryCandidates: (items: MemoryCandidateItem[]) => void
  clearMemoryCandidates: () => void
  clearPendingText: () => void
  clearText: () => void
  setError: (msg: string | null) => void
  resetState: () => void
}

const defaultState: TranscriptionState = {
  isTranscribing: false,
  transcriptionText: '',
  translations: [],
  interviewCoach: createInitialInterviewCoachState(),
  assists: [],
  assistLoading: false,
  liveAssist: '',
  summary: '',
  memoryCandidates: [],
  errorMessage: null
}

export const useTranscriptionStore = create<TranscriptionStore>()((set) => ({
  ...defaultState,
  setIsTranscribing: (v) => set({ isTranscribing: v }),
  setTranscriptionText: (text) => set({ transcriptionText: text }),
  addTranslation: (item) =>
    set((state) => ({ translations: [...state.translations, item].slice(-8) })),
  setInterviewCoach: (state) => set({ interviewCoach: state }),
  setAssistLoading: (v) => set({ assistLoading: v, ...(v ? { liveAssist: '' } : {}) }),
  setLiveAssist: (text) => set({ liveAssist: text }),
  addAssist: (item) =>
    set((state) => ({
      assists: [...state.assists, item].slice(-6),
      assistLoading: false,
      liveAssist: ''
    })),
  setSummary: (summary) => set({ summary }),
  addMemoryCandidates: (items) =>
    set((state) => {
      // Dedup against what's already pending (field+text) so repeated
      // distillations don't pile up duplicates in the confirmation bar.
      const seen = new Set(state.memoryCandidates.map((c) => `${c.field}::${c.text.toLowerCase()}`))
      const fresh = items.filter((c) => !seen.has(`${c.field}::${c.text.toLowerCase()}`))
      return { memoryCandidates: [...state.memoryCandidates, ...fresh].slice(-12) }
    }),
  clearMemoryCandidates: () => set({ memoryCandidates: [] }),
  // Pending-transcript clear: the live line was consumed (screenshot) or
  // discarded (clear-transcript shortcut). The coaching session continues, so
  // keep the timeline, assists, summary, translations, and memory candidates.
  clearPendingText: () => set({ transcriptionText: '' }),
  // Full session clear: the interview ended. Wipe everything coach-related.
  clearText: () =>
    set({
      transcriptionText: '',
      translations: [],
      interviewCoach: createInitialInterviewCoachState(),
      assists: [],
      assistLoading: false,
      liveAssist: '',
      summary: '',
      memoryCandidates: []
    }),
  setError: (msg) => set({ errorMessage: msg }),
  resetState: () => set({ ...defaultState, interviewCoach: createInitialInterviewCoachState() })
}))

export const useInterviewCoachPanelState = () =>
  useTranscriptionStore(
    useShallow((state) => ({
      isTranscribing: state.isTranscribing,
      transcriptionText: state.transcriptionText,
      translations: state.translations,
      interviewCoach: state.interviewCoach,
      assists: state.assists,
      assistLoading: state.assistLoading,
      liveAssist: state.liveAssist,
      summary: state.summary,
      memoryCandidates: state.memoryCandidates
    }))
  )

export const useTranscriptionControllerActions = () =>
  useTranscriptionStore(
    useShallow((state) => ({
      isTranscribing: state.isTranscribing,
      setIsTranscribing: state.setIsTranscribing,
      setTranscriptionText: state.setTranscriptionText,
      addTranslation: state.addTranslation,
      setInterviewCoach: state.setInterviewCoach,
      setAssistLoading: state.setAssistLoading,
      setLiveAssist: state.setLiveAssist,
      addAssist: state.addAssist,
      setSummary: state.setSummary,
      addMemoryCandidates: state.addMemoryCandidates,
      setError: state.setError,
      clearPendingText: state.clearPendingText,
      clearText: state.clearText
    }))
  )
