import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import type { AsrProvider, AsrProviderCallbacks, AsrStartOptions } from './types'
import { BoundedAudioBuffer } from './bounded-audio-buffer'
import { asrLog } from './asr-log'
import { mapQwenTranscriptionEvent, extractQwenError } from '../../shared/qwen-realtime-events'
import { buildQwenRealtimeSession } from './qwen-realtime-config'

// OpenAI-compatible realtime endpoint for the Qwen-ASR-Realtime family. The
// model is selected via the `model` query parameter.
const WS_BASE = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime'
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_BASE_DELAY_MS = 500
// Buffer audio while the socket is down/restarting so a brief network blip
// doesn't lose speech. 16kHz · 16-bit · ~10s ≈ 320KB — bounded so a task that
// never restarts can't grow memory without limit.
const MAX_BUFFER_BYTES = 16000 * 2 * 10
let cumulativeReconnects = 0

/** Total realtime-ASR reconnect attempts since process start (soak signal). */
export function getQwenCumulativeReconnects(): number {
  return cumulativeReconnects
}

/** ASR provider speaking DashScope's OpenAI-compatible realtime protocol
   (qwen3-asr-flash-realtime). Implements the same AsrProvider contract as
   DashScopeAsrProvider so the transcription pipeline is protocol-agnostic. */
export class QwenRealtimeAsrProvider implements AsrProvider {
  private ws: WebSocket | null = null
  private sessionReady = false
  private running = false
  private stopping = false
  private callbacks: AsrProviderCallbacks | null = null
  private options: AsrStartOptions | null = null
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null

  private sentChunks = 0
  private droppedChunks = 0
  private pendingAudio = new BoundedAudioBuffer(MAX_BUFFER_BYTES)

  start(options: AsrStartOptions, callbacks: AsrProviderCallbacks): void {
    if (this.running) return
    this.cleanup()
    this.callbacks = callbacks
    this.options = options
    this.running = true
    this.stopping = false
    this.reconnectAttempts = 0
    asrLog('qwen.start', {
      model: options.model,
      lang: options.languageHints?.join(',') || 'auto'
    })
    this.connect()
  }

  private connect(): void {
    const options = this.options
    if (!options) return

    this.sessionReady = false
    const url = `${WS_BASE}?model=${encodeURIComponent(options.model)}`
    this.ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${options.apiKey}` }
    })

    this.ws.on('open', () => {
      asrLog('qwen.ws.open — sending session.update')
      const session = buildQwenRealtimeSession(options.languageHints)
      this.send({ event_id: randomUUID(), type: 'session.update', session })
    })

    this.ws.on('message', (data: WebSocket.Data) => this.handleMessage(data))

    this.ws.on('error', (err) => {
      console.error('Qwen realtime WebSocket error:', err)
      asrLog('qwen.ws.error', { message: err instanceof Error ? err.message : String(err) })
    })

    this.ws.on('close', () => {
      asrLog('qwen.ws.close', {
        stopping: this.stopping,
        running: this.running,
        sentChunks: this.sentChunks,
        droppedChunks: this.droppedChunks
      })
      this.ws = null
      this.sessionReady = false
      if (this.stopping || !this.running) return

      // Unexpected drop: reconnect transparently so a brief interruption
      // doesn't end the interview transcription.
      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts += 1
        cumulativeReconnects += 1
        const delay = RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempts - 1)
        this.reconnectTimer = setTimeout(() => this.connect(), delay)
      } else {
        this.running = false
        this.callbacks?.onError('语音识别连接已断开，请重试')
        this.callbacks?.onFinished()
      }
    })
  }

  stop(): void {
    if (!this.running) return
    this.stopping = true
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionReady) {
      this.send({ type: 'session.finish' })
    }
    this.cleanup()
  }

  sendAudioChunk(chunk: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionReady) {
      // Session not ready (connecting / reconnecting): buffer instead of
      // dropping so a brief blip doesn't lose speech.
      if (this.running && !this.stopping) {
        this.pendingAudio.push(Buffer.from(chunk))
      } else {
        this.droppedChunks += 1
      }
      if (this.droppedChunks === 1) {
        asrLog('qwen.audio.buffered (session not ready)', {
          wsReady: this.ws?.readyState,
          sessionReady: this.sessionReady
        })
      }
      return
    }
    this.sentChunks += 1
    if (this.sentChunks === 1) asrLog('qwen.audio.firstChunkSent')
    this.appendAudio(Buffer.from(chunk))
  }

  private appendAudio(buf: Buffer): void {
    // The realtime protocol carries audio as a base64 string in a JSON event.
    this.send({ type: 'input_audio_buffer.append', audio: buf.toString('base64') })
  }

  private flushPendingAudio(): void {
    if (this.pendingAudio.size === 0) return
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    asrLog('qwen.audio.flushBuffered', {
      chunks: this.pendingAudio.size,
      bytes: this.pendingAudio.byteLength
    })
    const buffered = this.pendingAudio.drain()
    for (const buf of buffered) this.appendAudio(buf)
    this.sentChunks += buffered.length
  }

  isRunning(): boolean {
    return this.running
  }

  private send(payload: Record<string, unknown>): void {
    this.ws?.send(JSON.stringify(payload))
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'session.updated' || msg.type === 'session.created') {
        if (!this.sessionReady) {
          this.sessionReady = true
          asrLog('qwen.session.ready')
          // A clean session means the connection is healthy; reset backoff and
          // replay anything captured while (re)connecting.
          this.reconnectAttempts = 0
          this.flushPendingAudio()
          this.callbacks?.onStarted()
        }
        return
      }

      const sentence = mapQwenTranscriptionEvent(msg)
      if (sentence) {
        this.callbacks?.onSentence(sentence)
        return
      }

      const errorMsg = extractQwenError(msg)
      if (errorMsg) {
        console.error('Qwen realtime task failed:', errorMsg)
        asrLog('qwen.error', { error: errorMsg })
        this.callbacks?.onError(errorMsg)
        // A per-item failure is not fatal; only tear down on a top-level error.
        if (msg.type === 'error') this.cleanup()
        return
      }

      if (msg.type === 'session.finished') {
        this.cleanup()
        this.callbacks?.onFinished()
      }
    } catch (e) {
      console.error('Failed to parse Qwen realtime message:', e)
    }
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
    this.sessionReady = false
    this.running = false
    this.reconnectAttempts = 0
    this.sentChunks = 0
    this.droppedChunks = 0
    this.pendingAudio.clear()
  }
}
