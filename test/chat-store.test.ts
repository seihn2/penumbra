import { describe, expect, it, beforeEach } from 'vitest'
import { useChatStore, type ChatMessage } from '../src/renderer/src/lib/store/chat'

function reset() {
  useChatStore.setState({ messages: [], history: [], seq: 0 })
}

const userText = (id: string, text: string): ChatMessage => ({ id, role: 'user', text })
const assistant = (id: string, text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  role: 'assistant',
  text,
  ...extra
})

describe('chat store: dropLastErroredAssistant (retry safety)', () => {
  beforeEach(reset)

  it('removes only a trailing errored assistant bubble', () => {
    useChatStore.setState({
      messages: [userText('m0', '题目'), assistant('m1', '出错了', { error: true })]
    })
    useChatStore.getState().dropLastErroredAssistant()
    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ id: 'm0', role: 'user' })
  })

  it('never removes a successful assistant answer', () => {
    useChatStore.setState({
      messages: [userText('m0', '题目'), assistant('m1', '正确答案')]
    })
    useChatStore.getState().dropLastErroredAssistant()
    expect(useChatStore.getState().messages).toHaveLength(2)
  })

  it('never removes a trailing user turn', () => {
    useChatStore.setState({ messages: [userText('m0', '题目')] })
    useChatStore.getState().dropLastErroredAssistant()
    expect(useChatStore.getState().messages).toHaveLength(1)
  })

  it('preserves earlier history when dropping the failed answer', () => {
    // A multi-turn conversation whose latest answer errored: retry must keep
    // the whole prior conversation, only shedding the error bubble.
    useChatStore.setState({
      messages: [
        userText('m0', 'Q1'),
        assistant('m1', 'A1'),
        userText('m2', 'Q2'),
        assistant('m3', '失败', { error: true })
      ]
    })
    useChatStore.getState().dropLastErroredAssistant()
    const messages = useChatStore.getState().messages
    expect(messages.map((m) => m.id)).toEqual(['m0', 'm1', 'm2'])
  })

  it('is a no-op on an empty conversation', () => {
    useChatStore.getState().dropLastErroredAssistant()
    expect(useChatStore.getState().messages).toHaveLength(0)
  })
})

describe('chat store: addUserText keeps the first question', () => {
  beforeEach(reset)

  it('adds a user text bubble that survives without a full clear', () => {
    // Regression for the P0 bug: starting a text conversation used to emit a
    // full clear that wiped the optimistic first-question bubble. The store
    // action itself must simply append and retain the message.
    useChatStore.getState().addUserText('第一个问题')
    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ role: 'user', text: '第一个问题' })
  })
})
