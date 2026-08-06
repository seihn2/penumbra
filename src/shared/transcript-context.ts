import type { SpeakerRole } from './interview-coach'

export interface ContextTurn {
  speaker: SpeakerRole
  text: string
}

const SPEAKER_LABEL: Record<SpeakerRole, string> = {
  interviewer: '面试官',
  candidate: '我',
  // Use a word, not "?", so the model reads it as an unidentified speaker
  // rather than a literal question mark prefixing the line.
  unknown: '某人'
}

/** Build the labeled recent-conversation context fed to the AI assists. Caps
   both the number of turns and the length of each turn, so one very long
   utterance can't balloon the prompt (slower + more tokens). Long turns are
   truncated to their tail (the most recent words matter most for "what to say
   now"). Pure for testability. */
export function buildTranscriptContext(
  turns: ContextTurn[],
  options: { maxTurns?: number; maxCharsPerTurn?: number } = {}
): string {
  const maxTurns = options.maxTurns ?? 8
  const maxCharsPerTurn = options.maxCharsPerTurn ?? 200
  return turns
    .slice(-maxTurns)
    .map((turn) => {
      const text = turn.text.trim()
      const clipped =
        text.length > maxCharsPerTurn ? `…${text.slice(text.length - maxCharsPerTurn)}` : text
      return `${SPEAKER_LABEL[turn.speaker]}：${clipped}`
    })
    .join('\n')
}
