import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import type { AsrProvider, AsrProviderCallbacks, AsrStartOptions } from './types'
import { BoundedAudioBuffer } from './bounded-audio-buffer'
import { asrLog } from './asr-log'
import { buildRunTaskParameters } from './run-task-config'

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_BASE_DELAY_MS = 500
// Buffer audio while the socket is down/restarting so a brief network blip
// doesn't lose speech. 16kHz · 16-bit · ~10s ≈ 320KB — bounded so a task that
// never restarts can't grow memory without limit.
const MAX_BUFFER_BYTES = 16000 * 2 * 10

// Process-lifetime cumulative reconnect count across all providers, for the
// soak sampler's reconnect-storm signal (P2#46). Monotonic; never reset.
let cumulativeReconnects = 0

/** Total ASR reconnect attempts since process start (soak health signal). */
export function getCumulativeReconnects(): number {
  return cumulativeReconnects
}

export class DashScopeAsrProvider implements AsrProvider {
  private ws: WebSocket | null = null
  private taskId: string | null = null
  private taskStarted = false
  private running = false
  private stopping = false
  private callbacks: AsrProviderCallbacks | null = null
  private options: AsrStartOptions | null = null
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null

  private sentChunks = 0
  private droppedChunks = 0
  // Holds audio that arrived while the task wasn't ready (initial connect or a
  // reconnect), flushed once 'task-started' fires. Bounded (oldest dropped).
  private pendingAudio = new BoundedAudioBuffer(MAX_BUFFER_BYTES)

  start(options: AsrStartOptions, callbacks: AsrProviderCallbacks): void {
    if (this.running) return

    this.cleanup()
    this.callbacks = callbacks
    this.options = options
    this.running = true
    this.stopping = false
    this.reconnectAttempts = 0
    asrLog('provider.start', {
      model: options.model,
      lang: options.languageHints?.join(',') || 'auto'
    })
    this.connect()
  }

  private connect(): void {
    const options = this.options
    if (!options) return

    this.taskStarted = false
    this.taskId = randomUUID()
    this.ws = new WebSocket(WS_URL, {
      headers: { Authorization: `bearer ${options.apiKey}` }
    })

    this.ws.on('open', () => {
      asrLog('ws.open — sending run-task')
      const parameters = buildRunTaskParameters(options.model, options.languageHints)
      const runTask = {
        header: {
          action: 'run-task',
          task_id: this.taskId,
          streaming: 'duplex'
        },
        payload: {
          task_group: 'audio',
          task: 'asr',
          function: 'recognition',
          model: options.model,
          parameters,
          input: {}
        }
      }
      this.ws?.send(JSON.stringify(runTask))
    })

    this.ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(data)
    })

    this.ws.on('error', (err) => {
      console.error('Transcription WebSocket error:', err)
      asrLog('ws.error', { message: err instanceof Error ? err.message : String(err) })
      // Let the 'close' handler decide whether to reconnect or surface the error.
    })

    this.ws.on('close', () => {
      asrLog('ws.close', {
        stopping: this.stopping,
        running: this.running,
        sentChunks: this.sentChunks,
        droppedChunks: this.droppedChunks
      })
      this.ws = null
      this.taskStarted = false
      if (this.stopping || !this.running) return

      // Unexpected drop (e.g. network blip): try to reconnect transparently
      // so a brief interruption doesn't end the interview transcription.
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

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.taskId && this.taskStarted) {
      const finishTask = {
        header: {
          action: 'finish-task',
          task_id: this.taskId,
          streaming: 'duplex'
        },
        payload: {
          input: {}
        }
      }
      this.ws.send(JSON.stringify(finishTask))
    }

    this.cleanup()
  }

  sendAudioChunk(chunk: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.taskStarted) {
      // Task not ready (connecting / reconnecting): buffer instead of dropping
      // so a brief blip doesn't lose speech. Flushed on 'task-started'.
      if (this.running && !this.stopping) {
        this.bufferAudio(Buffer.from(chunk))
      } else {
        this.droppedChunks += 1
      }
      if (this.droppedChunks === 1) {
        asrLog('audio.buffered (task not started yet)', {
          wsReady: this.ws?.readyState,
          taskStarted: this.taskStarted
        })
      }
      return
    }
    this.sentChunks += 1
    if (this.sentChunks === 1) asrLog('audio.firstChunkSent')
    this.ws.send(Buffer.from(chunk))
  }

  private bufferAudio(buf: Buffer): void {
    this.pendingAudio.push(buf)
  }

  private flushPendingAudio(): void {
    if (this.pendingAudio.size === 0) return
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    asrLog('audio.flushBuffered', {
      chunks: this.pendingAudio.size,
      bytes: this.pendingAudio.byteLength
    })
    const buffered = this.pendingAudio.drain()
    for (const buf of buffered) this.ws.send(buf)
    this.sentChunks += buffered.length
  }

  isRunning(): boolean {
    return this.running
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const msg = JSON.parse(data.toString())
      const event = msg.header?.event

      if (event === 'task-started') {
        this.taskStarted = true
        asrLog('task-started')
        // A clean start means the connection is healthy; reset the backoff.
        this.reconnectAttempts = 0
        // Replay anything captured while we were (re)connecting.
        this.flushPendingAudio()
        this.callbacks?.onStarted()
        return
      }

      if (event === 'result-generated') {
        const sentence = msg.payload?.output?.sentence
        if (!sentence) return

        const text: string = sentence.text || ''
        if (!text) return

        this.callbacks?.onSentence({
          text,
          isPartial: sentence.sentence_end !== true
        })
        return
      }

      if (event === 'task-failed') {
        const errorMsg = msg.header?.error_message || '语音识别失败'
        console.error('Transcription task failed:', errorMsg)
        asrLog('task-failed', { error: errorMsg, code: msg.header?.error_code })
        this.callbacks?.onError(errorMsg)
        this.cleanup()
        return
      }

      if (event === 'task-finished') {
        this.cleanup()
        this.callbacks?.onFinished()
      }
    } catch (e) {
      console.error('Failed to parse transcription message:', e)
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
    this.taskId = null
    this.taskStarted = false
    this.running = false
    this.reconnectAttempts = 0
    this.sentChunks = 0
    this.droppedChunks = 0
    this.pendingAudio.clear()
  }
}
