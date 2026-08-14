import { create } from 'zustand'

interface ComposerFocusStore {
  request: {
    id: number
    clearDraft: boolean
  }
  requestFocus: (clearDraft?: boolean) => void
}

export const useComposerFocusStore = create<ComposerFocusStore>()((set) => ({
  request: { id: 0, clearDraft: false },
  requestFocus: (clearDraft = false) =>
    set((state) => ({
      request: { id: state.request.id + 1, clearDraft }
    }))
}))

export const useComposerFocusRequest = (): ComposerFocusStore['request'] =>
  useComposerFocusStore((state) => state.request)
