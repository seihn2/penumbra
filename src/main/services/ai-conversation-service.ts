import type { ModelMessage } from 'ai'
import { settings } from '../settings'
import { redactText } from '../../shared/sensitive-firewall'
import { hashImage } from '../../shared/asset-ref'

const MAX_RECENT_SCREENSHOTS = 5

/** Scrub secrets/PII (and the user's never-send words) from outgoing text when
   the local firewall is enabled. Applied to every user-authored text part
   before it becomes a conversation message, so nothing sensitive leaves the
   machine. No-op when the setting is off. */
function redactOutgoing(text: string): string {
  if (settings.redactBeforeSend === false) return text
  const neverSend = (settings.neverSendList ?? '')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean)
  return redactText(text, { neverSend }).text
}

/** When dual-source transcription is on, lines are prefixed with 面试官：/我：.
   Tell the model how to read those labels so it can tell the interviewer's
   questions apart from the candidate's own words. Returns '' otherwise. */
function speakerLabelHint(transcriptionText: string): string {
  return transcriptionText.includes('面试官：') || transcriptionText.includes('我：')
    ? '（转录中"面试官："为面试官所说，"我："为我所说）'
    : ''
}

export class AiConversationService {
  private conversationMessages: ModelMessage[] = []
  private recentScreenshots: string[] = []
  private hasAppendSeparator = false

  startWithScreenshot(screenshotData: string, transcriptionText: string) {
    transcriptionText = redactOutgoing(transcriptionText)
    this.conversationMessages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: transcriptionText
              ? `这是语音转录内容${speakerLabelHint(transcriptionText)}：\n${transcriptionText}\n\n同时附上屏幕截图：`
              : '这是屏幕截图'
          },
          {
            type: 'image',
            image: screenshotData
          }
        ]
      }
    ]
    this.recentScreenshots = [screenshotData]
    this.hasAppendSeparator = false
  }

  /** Start a new conversation from plain text (no screenshot). */
  startWithText(text: string) {
    text = redactOutgoing(text)
    // If the text carries dual-source speaker labels (from an ASR-started
    // conversation), prepend the same hint so the model reads them correctly.
    // Plain typed text has no labels, so it's passed through unchanged.
    const hint = speakerLabelHint(text)
    const content = hint ? `这是语音转录内容${hint}：\n${text}` : text
    this.conversationMessages = [
      {
        role: 'user',
        content: [{ type: 'text', text: content }]
      }
    ]
    this.recentScreenshots = []
    this.hasAppendSeparator = false
  }

  appendScreenshot(screenshotData: string, transcriptionText: string) {
    transcriptionText = redactOutgoing(transcriptionText)
    const newUserMessage: ModelMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: transcriptionText
            ? `这是下一部分截图和语音转录内容${speakerLabelHint(transcriptionText)}：\n${transcriptionText}\n请结合之前所有截图和分析，继续分析解答，不要遗漏任何信息。`
            : '这是下一部分截图，请结合之前所有截图和分析，继续分析解答，不要遗漏任何信息。'
        },
        {
          type: 'image',
          image: screenshotData
        }
      ]
    }
    this.conversationMessages.push(newUserMessage)
    // Dedup: skip pushing a screenshot identical (by hash) to the most recent
    // one, so re-capturing the same screen doesn't fill the cap with copies (P0#8).
    const lastShot = this.recentScreenshots[this.recentScreenshots.length - 1]
    if (!lastShot || hashImage(lastShot) !== hashImage(screenshotData)) {
      this.recentScreenshots.push(screenshotData)
      this.recentScreenshots = this.recentScreenshots.slice(-MAX_RECENT_SCREENSHOTS)
    }
  }

  appendAssistantResponse(assistantResponse: string) {
    if (!assistantResponse) return
    this.conversationMessages.push({
      role: 'assistant',
      content: assistantResponse
    })
  }

  appendFollowUp(question: string, assistantResponse: string) {
    this.conversationMessages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: redactOutgoing(question)
        }
      ]
    })
    this.appendAssistantResponse(assistantResponse)
  }

  /** Rebuild conversation context from an archived session's text messages.
     Screenshots aren't persisted, so restored image turns become text notes;
     this is enough to keep follow-up questions coherent. */
  restoreFromMessages(messages: { role: 'user' | 'assistant'; text: string }[]) {
    this.conversationMessages = messages
      .filter((m) => m.text.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.text }))
    this.recentScreenshots = []
    this.hasAppendSeparator = false
  }

  hasConversation() {
    return this.conversationMessages.length > 0
  }

  reset() {
    this.conversationMessages = []
    this.recentScreenshots = []
    this.hasAppendSeparator = false
  }

  getMessages() {
    return this.conversationMessages
  }

  getRecentScreenshots() {
    return this.recentScreenshots
  }

  consumeAppendSeparator() {
    if (!this.hasAppendSeparator) {
      this.hasAppendSeparator = true
      return '\n\n---\n\n'
    }
    return '\n\n'
  }
}
