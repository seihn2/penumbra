import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

interface SolutionState {
  isLoading: boolean
  solutionChunks: string[]
  screenshotData: string | null
  errorMessage: string | null
}

interface SolutionStore extends SolutionState {
  setIsLoading: (isReceiving: boolean) => void
  addSolutionChunk: (chunk: string) => void
  setSolutionChunks: (chunks: string[]) => void
  setScreenshotData: (data: string | null) => void
  setErrorMessage: (message: string | null) => void
  clearSolution: () => void
  resetState: () => void
}

const defaultState: SolutionState = {
  isLoading: false,
  solutionChunks: [],
  screenshotData: null,
  errorMessage: null
}

export const useSolutionStore = create<SolutionStore>()((set) => ({
  ...defaultState,
  setIsLoading: (isReceiving) => {
    set({ isLoading: isReceiving })
  },
  addSolutionChunk: (chunk) => {
    set((state) => ({
      solutionChunks: [...state.solutionChunks, chunk]
    }))
  },
  setSolutionChunks: (chunks) => {
    set({ solutionChunks: chunks })
  },
  setScreenshotData: (data) => {
    set({ screenshotData: data })
  },
  setErrorMessage: (message) => {
    set({ errorMessage: message })
  },
  clearSolution: () => {
    set({ solutionChunks: [], isLoading: false, errorMessage: null })
  },
  resetState: () => {
    set(defaultState)
  }
}))

export const useSolutionContent = () =>
  useSolutionStore(
    useShallow((state) => ({
      screenshotData: state.screenshotData,
      solutionChunks: state.solutionChunks,
      errorMessage: state.errorMessage,
      setErrorMessage: state.setErrorMessage
    }))
  )

export const useSolutionActions = () =>
  useSolutionStore(
    useShallow((state) => ({
      setScreenshotData: state.setScreenshotData,
      setIsLoading: state.setIsLoading,
      addSolutionChunk: state.addSolutionChunk,
      setErrorMessage: state.setErrorMessage,
      clearSolution: state.clearSolution
    }))
  )

export const useSolutionStatus = () =>
  useSolutionStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      setIsLoading: state.setIsLoading,
      screenshotData: state.screenshotData,
      solutionChunks: state.solutionChunks,
      errorMessage: state.errorMessage
    }))
  )

export const useSolutionErrorAction = () => useSolutionStore((state) => state.setErrorMessage)
