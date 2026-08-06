import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  /** Markdown / plain text content (assistant answers, text/ASR questions). */
  text: string
  /** Base64 PNG for screenshot user messages. */
  image?: string
  /** True when a screenshot existed but its base64 was dropped from storage. */
  hasImage?: boolean
  /** True while an assistant message is still streaming. */
  streaming?: boolean
  /** True if this assistant message ended in an error. */
  error?: boolean
}

export interface ArchivedSession {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
}

interface ChatState {
  messages: ChatMessage[]
  history: ArchivedSession[]
  seq: number
}

interface ChatStore extends ChatState {
  addUserScreenshot: (image: string) => void
  addUserText: (text: string) => void
  startAssistant: () => void
  appendAssistant: (chunk: string) => void
  finishAssistant: () => void
  failAssistant: (message: string) => void
  dropLastErroredAssistant: () => void
  clear: () => void
  restoreSession: (id: string) => void
  deleteSession: (id: string) => void
}

function nextId(seq: number): string {
  return `m${seq}`
}

function sessionTitle(messages: ChatMessage[]): string {
  const firstText = messages.find((m) => m.text.trim())?.text.trim()
  if (firstText) return firstText.replace(/\s+/g, ' ').slice(0, 40)
  if (messages.some((m) => m.image)) return '📷'
  return '…'
}

/** Archive the current messages into history (newest first), capped at 50. */
function archive(state: ChatState): ArchivedSession[] {
  const clean = state.messages.filter((m) => !(m.role === 'assistant' && m.streaming && !m.text))
  if (clean.length === 0) return state.history
  const entry: ArchivedSession = {
    id: `s${state.seq}`,
    title: sessionTitle(clean),
    createdAt: Date.now(),
    messages: clean.map((m) => ({ ...m, streaming: false }))
  }
  return [entry, ...state.history].slice(0, 50)
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      history: [],
      seq: 0,
      addUserScreenshot: (image) =>
        set((s) => ({
          seq: s.seq + 1,
          messages: [...s.messages, { id: nextId(s.seq), role: 'user', text: '', image }]
        })),
      addUserText: (text) =>
        set((s) => ({
          seq: s.seq + 1,
          messages: [...s.messages, { id: nextId(s.seq), role: 'user', text }]
        })),
      startAssistant: () =>
        set((s) => {
          const last = s.messages[s.messages.length - 1]
          if (last && last.role === 'assistant' && last.streaming && !last.text) return s
          return {
            seq: s.seq + 1,
            messages: [
              ...s.messages,
              { id: nextId(s.seq), role: 'assistant', text: '', streaming: true }
            ]
          }
        }),
      appendAssistant: (chunk) =>
        set((s) => {
          const messages = [...s.messages]
          const last = messages[messages.length - 1]
          if (!last || last.role !== 'assistant' || !last.streaming) {
            // No active assistant bubble: ignore separator/whitespace-only
            // chunks (e.g. follow-up separators) so we don't spawn an empty one.
            if (!chunk.trim()) return s
            return {
              seq: s.seq + 1,
              messages: [
                ...messages,
                { id: nextId(s.seq), role: 'assistant', text: chunk, streaming: true }
              ]
            }
          }
          messages[messages.length - 1] = { ...last, text: last.text + chunk }
          return { messages }
        }),
      finishAssistant: () =>
        set((s) => {
          const messages = [...s.messages]
          const last = messages[messages.length - 1]
          if (last && last.role === 'assistant' && last.streaming) {
            // Drop an empty bubble (e.g. generation stopped before any output)
            // so a frozen typing indicator is never left behind.
            if (!last.text) {
              messages.pop()
              return { messages }
            }
            messages[messages.length - 1] = { ...last, streaming: false }
          }
          return { messages }
        }),
      failAssistant: (message) =>
        set((s) => {
          const messages = [...s.messages]
          const last = messages[messages.length - 1]
          if (last && last.role === 'assistant' && last.streaming) {
            messages[messages.length - 1] = {
              ...last,
              streaming: false,
              error: true,
              text: last.text || message
            }
            return { messages }
          }
          return {
            seq: s.seq + 1,
            messages: [
              ...messages,
              { id: nextId(s.seq), role: 'assistant', text: message, error: true }
            ]
          }
        }),
      clear: () =>
        set((s) => ({
          history: archive(s),
          messages: []
        })),
      // Retry re-runs the last request; drop the failed assistant bubble first
      // so the fresh answer replaces it instead of stacking under the error.
      // Only removes a trailing errored assistant message — never user turns.
      dropLastErroredAssistant: () =>
        set((s) => {
          const last = s.messages[s.messages.length - 1]
          if (last && last.role === 'assistant' && last.error) {
            return { messages: s.messages.slice(0, -1) }
          }
          return s
        }),
      restoreSession: (id) =>
        set((s) => {
          const entry = s.history.find((h) => h.id === id)
          if (!entry) return s
          // Archive whatever is currently shown, then load the chosen session.
          const history = archive(s).filter((h) => h.id !== id)
          return { messages: entry.messages, history }
        }),
      deleteSession: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) }))
    }),
    {
      name: 'penumbra-chat-history',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Persist the live conversation AND the archived history so neither is
      // lost on restart. Strip base64 screenshots (they'd blow past the
      // localStorage quota and fail the whole write) and clear any unfinished
      // streaming flag so a restored message never shows a stuck "生成中".
      partialize: (s) => ({
        messages: s.messages
          .filter((m) => !(m.role === 'assistant' && m.streaming && !m.text))
          .map(({ image, ...rest }) =>
            image ? { ...rest, streaming: false, hasImage: true } : { ...rest, streaming: false }
          ),
        history: s.history.map((session) => ({
          ...session,
          messages: session.messages.map(({ image, ...rest }) =>
            image ? { ...rest, hasImage: true } : rest
          )
        })),
        seq: s.seq
      })
    }
  )
)

export const useChatMessages = (): ChatMessage[] => useChatStore((s) => s.messages)
export const useChatHistory = (): ArchivedSession[] => useChatStore((s) => s.history)

export const useChatActions = () =>
  useChatStore(
    useShallow((s) => ({
      addUserScreenshot: s.addUserScreenshot,
      addUserText: s.addUserText,
      startAssistant: s.startAssistant,
      appendAssistant: s.appendAssistant,
      finishAssistant: s.finishAssistant,
      failAssistant: s.failAssistant,
      dropLastErroredAssistant: s.dropLastErroredAssistant,
      clear: s.clear
    }))
  )
