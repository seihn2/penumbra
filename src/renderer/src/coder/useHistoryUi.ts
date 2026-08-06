import { create } from 'zustand'

interface HistoryUiState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useHistoryUi = create<HistoryUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open }))
}))
