/** AudioWorklet processor source, loaded via a Blob URL so it works the same in
   dev and in the packaged app (no bundler path juggling).

   Why a worklet: the old ScriptProcessorNode runs its callback on the main
   thread, so heavy React re-renders or AI streaming can starve it and drop
   audio frames → dropped words in the transcript. A worklet runs on the
   dedicated audio render thread and is immune to main-thread jank.

   The render quantum is only 128 frames; emitting that 125×/s would be wasteful
   IPC. We accumulate into ~2048-sample blocks (matching the previous chunk
   size) before posting int16 PCM back to the main thread. Peak level is sent
   alongside so the existing capture diagnostics keep working without
   re-scanning the buffer on the main thread. */
export const PCM_WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const blockSize = (options && options.processorOptions && options.processorOptions.blockSize) || 2048
    this._blockSize = blockSize
    this._buf = new Float32Array(blockSize)
    this._fill = 0
  }

  _flush() {
    const len = this._fill
    const int16 = new Int16Array(len)
    let peak = 0
    let sumSquares = 0
    for (let i = 0; i < len; i++) {
      let s = this._buf[i]
      if (s > 1) s = 1
      else if (s < -1) s = -1
      const a = s < 0 ? -s : s
      if (a > peak) peak = a
      sumSquares += s * s
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    const rms = len > 0 ? Math.sqrt(sumSquares / len) : 0
    this.port.postMessage({ pcm: int16.buffer, peak, rms }, [int16.buffer])
    this._fill = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true
    const channel = input[0]
    for (let i = 0; i < channel.length; i++) {
      this._buf[this._fill++] = channel[i]
      if (this._fill >= this._blockSize) this._flush()
    }
    return true
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
`
