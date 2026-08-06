/** A bounded FIFO of audio chunks, used to hold PCM while the ASR socket is
   (re)connecting so a brief network blip doesn't lose speech. When the total
   byte size exceeds `maxBytes`, the oldest chunks are dropped first, so memory
   stays bounded even if the task never restarts. */
export class BoundedAudioBuffer {
  private chunks: Buffer[] = []
  private bytes = 0

  constructor(private readonly maxBytes: number) {}

  push(chunk: Buffer): void {
    this.chunks.push(chunk)
    this.bytes += chunk.byteLength
    while (this.bytes > this.maxBytes && this.chunks.length > 0) {
      const dropped = this.chunks.shift()!
      this.bytes -= dropped.byteLength
    }
  }

  /** Return all buffered chunks and reset to empty. */
  drain(): Buffer[] {
    const out = this.chunks
    this.chunks = []
    this.bytes = 0
    return out
  }

  clear(): void {
    this.chunks = []
    this.bytes = 0
  }

  get size(): number {
    return this.chunks.length
  }

  get byteLength(): number {
    return this.bytes
  }
}
