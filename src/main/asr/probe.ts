import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import { asrProtocolFor } from '../../shared/asr-models'
import { buildRunTaskParameters } from './run-task-config'

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'
const REALTIME_WS_BASE = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime'
const PROBE_TIMEOUT_MS = 10000

export interface AsrProbeResult {
  ok: boolean
  error?: string
}

/** One-shot connectivity check: confirm the key/model by opening the ASR
   WebSocket and waiting for the server to accept or reject. No audio is
   streamed. Routes to the wire protocol the model speaks. */
export function probeAsrConnection(apiKey: string, model: string): Promise<AsrProbeResult> {
  return asrProtocolFor(model) === 'realtime'
    ? probeRealtime(apiKey, model)
    : probeRunTask(apiKey, model)
}

function probeRunTask(apiKey: string, model: string): Promise<AsrProbeResult> {
  return new Promise((resolve) => {
    let settled = false
    const taskId = randomUUID()
    let ws: WebSocket

    const finish = (result: AsrProbeResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {
        // ignore
      }
      resolve(result)
    }

    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), PROBE_TIMEOUT_MS)

    try {
      ws = new WebSocket(WS_URL, { headers: { Authorization: `bearer ${apiKey}` } })
    } catch (error) {
      finish({ ok: false, error: error instanceof Error ? error.message : 'connect failed' })
      return
    }

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
          payload: {
            task_group: 'audio',
            task: 'asr',
            function: 'recognition',
            model,
            parameters: buildRunTaskParameters(model),
            input: {}
          }
        })
      )
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString())
        const event = msg.header?.event
        if (event === 'task-started') {
          // Politely end the task so the server tears it down instead of
          // leaving it hanging until timeout.
          try {
            ws.send(
              JSON.stringify({
                header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
                payload: { input: {} }
              })
            )
          } catch {
            // ignore
          }
          finish({ ok: true })
        } else if (event === 'task-failed') {
          finish({ ok: false, error: msg.header?.error_message || 'task failed' })
        }
      } catch {
        // ignore non-JSON frames
      }
    })

    ws.on('error', (err) => finish({ ok: false, error: err.message }))
    ws.on('unexpected-response', (_req, res) =>
      finish({ ok: false, error: `HTTP ${res.statusCode}` })
    )
  })
}

function probeRealtime(apiKey: string, model: string): Promise<AsrProbeResult> {
  return new Promise((resolve) => {
    let settled = false
    let ws: WebSocket

    const finish = (result: AsrProbeResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {
        // ignore
      }
      resolve(result)
    }

    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), PROBE_TIMEOUT_MS)

    try {
      ws = new WebSocket(`${REALTIME_WS_BASE}?model=${encodeURIComponent(model)}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
    } catch (error) {
      finish({ ok: false, error: error instanceof Error ? error.message : 'connect failed' })
      return
    }

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          event_id: randomUUID(),
          type: 'session.update',
          session: { input_audio_format: 'pcm', sample_rate: 16000 }
        })
      )
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString())
        // Either a created or updated session confirms the key/model are valid.
        if (msg.type === 'session.created' || msg.type === 'session.updated') {
          finish({ ok: true })
        } else if (msg.type === 'error') {
          finish({ ok: false, error: msg.error?.message || 'session error' })
        }
      } catch {
        // ignore non-JSON frames
      }
    })

    ws.on('error', (err) => finish({ ok: false, error: err.message }))
    ws.on('unexpected-response', (_req, res) =>
      finish({ ok: false, error: `HTTP ${res.statusCode}` })
    )
  })
}
