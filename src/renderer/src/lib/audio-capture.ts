type AudioSourceRole = 'system' | 'microphone'

import { PCM_WORKLET_SOURCE } from './audio-worklet-source'

/** Thrown when a captured stream carries no audio track (e.g. the user shared
   a screen/window without enabling "share audio"). */
export class NoAudioTrackError extends Error {
  constructor() {
    super('No audio track in captured stream')
    this.name = 'NoAudioTrackError'
  }
}

interface CaptureSession {
  stream: MediaStream
  audioContext: AudioContext
  // The node feeding audio frames: an AudioWorkletNode (preferred, off the main
  // thread) or a ScriptProcessorNode (legacy fallback when the worklet fails).
  node: AudioWorkletNode | ScriptProcessorNode
}

const sessions: Partial<Record<AudioSourceRole, CaptureSession>> = {}

// Lightweight capture diagnostics so the UI can show whether audio is actually
// flowing (chunks arriving) and whether it's silent — invaluable for telling
// "mic not captured" apart from "ASR/network issue".
type CaptureDiagnostics = { source: AudioSourceRole; chunks: number; level: number }
let onDiagnostics: ((d: CaptureDiagnostics) => void) | null = null
const chunkCounts: Partial<Record<AudioSourceRole, number>> = {}

export function setCaptureDiagnosticsListener(
  listener: ((d: CaptureDiagnostics) => void) | null
): void {
  onDiagnostics = listener
}

// Lightweight silence diagnostics: track when each source went quiet so we can
// log prolonged silence. Purely observational — never alters streaming.
const SILENCE_RMS_THRESHOLD = 0.01
const PROLONGED_SILENCE_MS = 30000
const silenceState: Partial<Record<AudioSourceRole, { since: number; logged: boolean }>> = {}

function trackSilence(source: AudioSourceRole, rms: number): void {
  const now = Date.now()

  if (rms >= SILENCE_RMS_THRESHOLD) {
    silenceState[source] = undefined
    return
  }
  const state = silenceState[source]
  if (!state) {
    silenceState[source] = { since: now, logged: false }
  } else if (!state.logged && now - state.since >= PROLONGED_SILENCE_MS) {
    state.logged = true
    console.info(`[asr] prolonged silence on ${source} (>${PROLONGED_SILENCE_MS / 1000}s)`)
  }
}

function rmsLevel(float32: Float32Array): number {
  let sumSquares = 0
  for (let i = 0; i < float32.length; i++) sumSquares += float32[i] * float32[i]
  return float32.length > 0 ? Math.sqrt(sumSquares / float32.length) : 0
}

function floatToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return int16
}

const WORKLET_BLOCK_SIZE = 2048

let workletModuleCache: string | null = null

/** Compute peak amplitude of a float32 PCM block (for capture diagnostics). */
function peakLevel(float32: Float32Array): number {
  let peak = 0
  for (let i = 0; i < float32.length; i++) {
    const v = Math.abs(float32[i])
    if (v > peak) peak = v
  }
  return peak
}

/** Emit one int16 PCM chunk to the main process and update diagnostics. */
function emitChunk(source: AudioSourceRole, chunk: ArrayBuffer, peak: number): void {
  window.api.sendTranscriptionAudioSourceChunk(source, chunk)
  if (onDiagnostics) {
    chunkCounts[source] = (chunkCounts[source] ?? 0) + 1
    onDiagnostics({ source, chunks: chunkCounts[source]!, level: peak })
  }
}

/** Try to build the AudioWorklet-based capture node (preferred: runs on the
   audio thread, immune to main-thread jank that drops frames). Returns the node
   on success, or null if the worklet can't be loaded so the caller can fall
   back to ScriptProcessorNode. */
async function tryCreateWorkletNode(
  source: AudioSourceRole,
  audioContext: AudioContext,
  mediaSource: MediaStreamAudioSourceNode
): Promise<AudioWorkletNode | null> {
  if (!audioContext.audioWorklet) return null
  try {
    if (!workletModuleCache) {
      workletModuleCache = URL.createObjectURL(
        new Blob([PCM_WORKLET_SOURCE], { type: 'application/javascript' })
      )
    }
    await audioContext.audioWorklet.addModule(workletModuleCache)
    const node = new AudioWorkletNode(audioContext, 'pcm-capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      processorOptions: { blockSize: WORKLET_BLOCK_SIZE }
    })
    node.port.onmessage = (event: MessageEvent) => {
      const { pcm, peak, rms } = event.data as { pcm: ArrayBuffer; peak: number; rms: number }
      trackSilence(source, rms)
      emitChunk(source, pcm, peak)
    }
    mediaSource.connect(node)
    // A muted sink keeps the graph pulling audio without echoing to speakers.
    node.connect(audioContext.destination)
    window.api.asrDebugLog(`capture: AudioWorklet active for ${source}`)
    return node
  } catch (error) {
    // Log to the file (not just console) so packaged builds reveal whether the
    // worklet loaded or we silently fell back to the main-thread path.
    window.api.asrDebugLog(
      `capture: AudioWorklet unavailable for ${source}, falling back to ScriptProcessor: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return null
  }
}

/** Legacy ScriptProcessorNode capture path. Deprecated and runs on the main
   thread (can drop frames under load) but kept as a guaranteed fallback. */
function createScriptProcessorNode(
  source: AudioSourceRole,
  audioContext: AudioContext,
  mediaSource: MediaStreamAudioSourceNode
): ScriptProcessorNode {
  const processor = audioContext.createScriptProcessor(WORKLET_BLOCK_SIZE, 1, 1)
  processor.onaudioprocess = (event) => {
    const channel = event.inputBuffer.getChannelData(0)
    trackSilence(source, rmsLevel(channel))
    const int16 = floatToInt16(channel)
    const chunk = int16.buffer.slice(0) as ArrayBuffer
    emitChunk(source, chunk, peakLevel(channel))
  }
  mediaSource.connect(processor)
  processor.connect(audioContext.destination)
  return processor
}

async function createCaptureSession(source: AudioSourceRole, stream: MediaStream): Promise<void> {
  const audioContext = new AudioContext({ sampleRate: 16000 })
  try {
    const mediaSource = audioContext.createMediaStreamSource(
      new MediaStream(stream.getAudioTracks())
    )
    const node =
      (await tryCreateWorkletNode(source, audioContext, mediaSource)) ??
      createScriptProcessorNode(source, audioContext, mediaSource)

    sessions[source] = { stream, audioContext, node }
  } catch (error) {
    // Setup failed: tear down the context and stream so we don't leak an
    // AudioContext or leave the screen-share/mic indicator lit.
    audioContext.close()
    stream.getTracks().forEach((track) => track.stop())
    throw error
  }
}

export async function startAudioCapture(): Promise<void> {
  await startSystemAudioCapture()
}

export async function startDualSourceAudioCapture(): Promise<void> {
  await startSystemAudioCapture()
  await startMicrophoneAudioCapture()
}

// Exported so the toggle can start each source independently and tolerate one
// failing (e.g. system-audio loopback is unreliable on some macOS versions)
// while the other still works.
export { startSystemAudioCapture, startMicrophoneAudioCapture }

async function startSystemAudioCapture(): Promise<void> {
  // Request video alongside audio: on macOS the main-process handler returns a
  // loopback audio track only when a screen source accompanies it (an
  // audio-only request fails capture with AbortError). We stop the video track
  // immediately — we only consume the system-audio track.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true
  })
  stream.getVideoTracks().forEach((track) => track.stop())
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((track) => track.stop())
    throw new NoAudioTrackError()
  }
  await createCaptureSession('system', stream)
}

async function startMicrophoneAudioCapture(deviceId?: string): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Clean up the candidate's mic input — noisy interview environments
    // (cafe/office) otherwise degrade recognition accuracy. When a specific
    // input device is chosen (e.g. a real mic, or a virtual device like
    // BlackHole routing system audio), capture from exactly that device.
    audio: deviceId
      ? { deviceId: { exact: deviceId } }
      : {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        },
    video: false
  })
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((track) => track.stop())
    throw new NoAudioTrackError()
  }
  await createCaptureSession('microphone', stream)
}

/** List available audio input devices (microphones + virtual devices like
   BlackHole). Labels are only populated after mic permission is granted, so a
   one-shot getUserMedia is used to unlock them when needed. */
export async function listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  let devices = await navigator.mediaDevices.enumerateDevices()
  let inputs = devices.filter((d) => d.kind === 'audioinput')
  // Labels are blank until permission is granted at least once.
  if (inputs.length > 0 && inputs.every((d) => !d.label)) {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
      probe.getTracks().forEach((t) => t.stop())
      devices = await navigator.mediaDevices.enumerateDevices()
      inputs = devices.filter((d) => d.kind === 'audioinput')
    } catch {
      // Permission denied; return what we have (likely unlabeled).
    }
  }
  return inputs
}

export function stopAudioCapture(): void {
  stopCaptureSession('system')
  stopCaptureSession('microphone')
  chunkCounts.system = 0
  chunkCounts.microphone = 0
}

function stopCaptureSession(source: AudioSourceRole): void {
  const session = sessions[source]
  if (!session) return

  // Drop the session first so it's always cleared even if teardown throws
  // (e.g. an already-closed context), and detach the audio callback.
  delete sessions[source]
  silenceState[source] = undefined
  const node = session.node
  if ('port' in node) {
    node.port.onmessage = null
  } else {
    node.onaudioprocess = null
  }
  try {
    node.disconnect()
  } catch {
    // ignore
  }
  try {
    session.audioContext.close()
  } catch {
    // ignore
  }
  session.stream.getTracks().forEach((track) => track.stop())
}
