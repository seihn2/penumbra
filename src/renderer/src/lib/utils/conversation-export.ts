import type { ChatMessage } from '@/lib/store/chat'

/** Render chat messages as a Markdown transcript. User screenshots become an
   image placeholder line (the base64 isn't embedded). Returns '' when empty. */
export function conversationToMarkdown(messages: ChatMessage[]): string {
  if (messages.length === 0) return ''

  const blocks = messages.map((m) => {
    if (m.role === 'user') {
      if (m.image || m.hasImage) {
        const note = m.text.trim()
        return `## 🧑 User\n\n_[screenshot]_${note ? `\n\n${note}` : ''}`
      }
      return `## 🧑 User\n\n${m.text.trim()}`
    }
    const heading = m.error ? '## ⚠️ Assistant (error)' : '## 🤖 Assistant'
    return `${heading}\n\n${m.text.trim()}`
  })

  return `# Penumbra Conversation\n\n${blocks.join('\n\n---\n\n')}\n`
}
