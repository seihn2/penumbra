import type { AudioSourceRole } from './asr/types'

const MAX_ACCUMULATED_CHARS = 8000

function speakerLabel(source: AudioSourceRole): string {
  return source === 'microphone' ? '我' : '面试官'
}

/** Accumulates finalized ASR text plus per-source in-progress partials, with
   optional dual-source speaker labelling and a length cap. Pure/stateful but
   free of Electron deps so it can be unit-tested. */
export class TranscriptBuffer {
  private accumulated = ''
  private partials: Record<AudioSourceRole, string> = { system: '', microphone: '' }

  constructor(private readonly maxChars = MAX_ACCUMULATED_CHARS) {}

  /** Record a sentence event. `dualSource` controls speaker labelling. */
  add(source: AudioSourceRole, text: string, isPartial: boolean, dualSource: boolean): void {
    if (isPartial) {
      this.partials[source] = text
      return
    }
    if (dualSource) {
      this.append(`${speakerLabel(source)}：${text}\n`)
    } else {
      this.append(text)
    }
    this.partials[source] = ''
  }

  private append(addition: string): void {
    this.accumulated += addition
    if (this.accumulated.length > this.maxChars) {
      const trimmed = this.accumulated.slice(-this.maxChars)
      // Prefer cutting at a newline boundary so a labeled line isn't split.
      const firstBreak = trimmed.indexOf('\n')
      this.accumulated = firstBreak > 0 ? trimmed.slice(firstBreak + 1) : trimmed
    }
  }

  /** Full text: accumulated finals plus current partials (labeled in dual). */
  getText(dualSource: boolean): string {
    const partials = (['system', 'microphone'] as const)
      .filter((source) => this.partials[source])
      .map((source) =>
        dualSource ? `${speakerLabel(source)}：${this.partials[source]}` : this.partials[source]
      )
      .join(dualSource ? '\n' : '')
    return this.accumulated + partials
  }

  reset(): void {
    this.accumulated = ''
    this.partials = { system: '', microphone: '' }
  }
}
