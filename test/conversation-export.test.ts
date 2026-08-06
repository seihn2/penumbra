import { describe, expect, it } from 'vitest'
import { conversationToMarkdown } from '../src/renderer/src/lib/utils/conversation-export'
import type { ChatMessage } from '../src/renderer/src/lib/store/chat'

const msg = (m: Partial<ChatMessage> & Pick<ChatMessage, 'role'>): ChatMessage => ({
  id: 'x',
  text: '',
  ...m
})

describe('conversationToMarkdown', () => {
  it('returns empty string for no messages', () => {
    expect(conversationToMarkdown([])).toBe('')
  })

  it('renders user and assistant text turns', () => {
    const md = conversationToMarkdown([
      msg({ role: 'user', text: 'two sum?' }),
      msg({ role: 'assistant', text: 'Use a hash map.' })
    ])
    expect(md).toContain('# Penumbra Conversation')
    expect(md).toContain('## 🧑 User\n\ntwo sum?')
    expect(md).toContain('## 🤖 Assistant\n\nUse a hash map.')
    expect(md).toContain('\n\n---\n\n')
  })

  it('renders a screenshot placeholder for image turns', () => {
    const md = conversationToMarkdown([msg({ role: 'user', image: 'BASE64DATA' })])
    expect(md).toContain('_[screenshot]_')
    expect(md).not.toContain('BASE64DATA')
  })

  it('treats restored hasImage turns as screenshots and keeps any note', () => {
    const md = conversationToMarkdown([msg({ role: 'user', hasImage: true, text: 'follow this' })])
    expect(md).toContain('_[screenshot]_')
    expect(md).toContain('follow this')
  })

  it('marks error assistant turns distinctly', () => {
    const md = conversationToMarkdown([
      msg({ role: 'assistant', text: 'request failed', error: true })
    ])
    expect(md).toContain('Assistant (error)')
    expect(md).toContain('request failed')
  })

  it('omits the note line for an image turn without text', () => {
    const md = conversationToMarkdown([msg({ role: 'user', image: 'BASE64DATA' })])
    // Placeholder is the last content before the trailing newline, no extra note.
    expect(md).toContain('## 🧑 User\n\n_[screenshot]_')
    expect(md.endsWith('_[screenshot]_\n')).toBe(true)
  })

  it('separates every block with the divider and ends with a trailing newline', () => {
    const md = conversationToMarkdown([
      msg({ role: 'user', text: 'q1' }),
      msg({ role: 'assistant', text: 'a1' }),
      msg({ role: 'user', text: 'q2' }),
      msg({ role: 'assistant', text: 'a2' })
    ])
    // Three dividers join four blocks.
    expect(md.split('\n\n---\n\n')).toHaveLength(4)
    expect(md.endsWith('\n')).toBe(true)
    expect(md.startsWith('# Penumbra Conversation')).toBe(true)
  })

  it('preserves markdown special characters in message text verbatim', () => {
    const raw = '# heading **bold** `code` [link](url) | table |'
    const md = conversationToMarkdown([msg({ role: 'assistant', text: raw })])
    expect(md).toContain(raw)
  })
})
