import type { TranscriptTurn } from './interview-coach'

const DEFAULT_PREROLL_MS = 2500

export function collectSpokenInterviewAnswer(input: {
  turns: TranscriptTurn[]
  questionTimestamp: number
  nextQuestionTimestamp?: number
  prerollMs?: number
}): string {
  const start = input.questionTimestamp - (input.prerollMs ?? DEFAULT_PREROLL_MS)
  const end = input.nextQuestionTimestamp ?? Number.POSITIVE_INFINITY
  const lines: string[] = []

  for (const turn of input.turns) {
    const text = turn.text.trim()
    if (
      turn.speaker !== 'candidate' ||
      turn.isPartial ||
      !text ||
      turn.timestamp < start ||
      turn.timestamp >= end
    ) {
      continue
    }
    if (lines[lines.length - 1] !== text) lines.push(text)
  }

  return lines.join('\n')
}
