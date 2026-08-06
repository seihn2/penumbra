import type { BrowserWindow } from 'electron'
import { withFirstChunkTimeout } from '../../shared/stream-timeout'
import { classifyFailure, type FailureKind } from '../../shared/retry-policy'

export type AbortReason = 'user' | 'new-request'

// If the model sends no first token within this long, treat it as a stalled
// provider: abort and surface an error instead of spinning "生成中" forever.
const FIRST_CHUNK_TIMEOUT_MS = 30000

export interface StreamContext {
  controller: AbortController
  reason: AbortReason | null
}

interface RunTextStreamOptions {
  window: BrowserWindow
  streamContext: StreamContext
  createStream: (signal: AbortSignal) => AsyncIterable<string>
  errorPrefix: string
  onComplete?: (assistantResponse: string) => void
  onFinally?: () => void
}

export class StreamManager {
  private currentStreamContext: StreamContext | null = null

  abort(reason: AbortReason) {
    if (!this.currentStreamContext) return
    this.currentStreamContext.reason = reason
    this.currentStreamContext.controller.abort()
  }

  hasActiveStream() {
    return this.currentStreamContext !== null
  }

  createContext() {
    const streamContext: StreamContext = {
      controller: new AbortController(),
      reason: null
    }
    this.currentStreamContext = streamContext
    return streamContext
  }

  async runTextStream(options: RunTextStreamOptions) {
    const { window, streamContext, createStream, errorPrefix, onComplete, onFinally } = options
    let endedNaturally = true
    let streamStarted = false
    let assistantResponse = ''

    try {
      const textStream = createStream(streamContext.controller.signal)
      streamStarted = true

      // Guard against a provider that accepts the request but never streams a
      // token — without this the UI would spin indefinitely.
      const guardedStream = withFirstChunkTimeout(
        textStream,
        FIRST_CHUNK_TIMEOUT_MS,
        streamContext.controller
      )

      try {
        for await (const chunk of guardedStream) {
          if (streamContext.controller.signal.aborted) {
            endedNaturally = false
            break
          }
          assistantResponse += chunk
          window.webContents.send('solution-chunk', chunk)
        }
      } catch (error) {
        // A first-chunk timeout aborts the controller, so check it explicitly:
        // it must surface as an error, not be mistaken for a user cancel.
        if (isTimeoutError(error)) {
          endedNaturally = false
          console.error(errorPrefix, 'first-chunk timeout')
          window.webContents.send('solution-error', AI_TIMEOUT_MESSAGE)
        } else if (!streamContext.controller.signal.aborted) {
          endedNaturally = false
          console.error(errorPrefix, error)
          window.webContents.send('solution-error', describeFailure(error))
        } else {
          endedNaturally = false
        }
      }

      if (streamContext.controller.signal.aborted) {
        if (streamContext.reason === 'user') {
          window.webContents.send('solution-stopped')
        }
      } else if (endedNaturally) {
        onComplete?.(assistantResponse)
        window.webContents.send('solution-complete')
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        console.error(errorPrefix, 'first-chunk timeout')
        window.webContents.send('solution-error', AI_TIMEOUT_MESSAGE)
      } else if (streamContext.controller.signal.aborted) {
        if (streamContext.reason === 'user') {
          window.webContents.send('solution-stopped')
        }
      } else {
        console.error(errorPrefix, error)
        window.webContents.send('solution-error', describeFailure(error))
      }
    } finally {
      if (this.currentStreamContext === streamContext) {
        this.currentStreamContext = null
      }
      if (!streamStarted && streamContext.reason === 'user') {
        window.webContents.send('solution-stopped')
      }
      onFinally?.()
    }
  }
}

const AI_TIMEOUT_MESSAGE = 'AI 响应超时：服务长时间无响应，请检查网络或模型服务后重试。'

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'AI_STREAM_TIMEOUT'
}

function extractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error) || '未知错误'
  }

  const apiError = error as Error & {
    responseBody?: string
    statusCode?: number
    data?: unknown
  }

  if (apiError.responseBody) {
    try {
      const body = JSON.parse(apiError.responseBody)
      if (body.message) {
        return body.message
      }
      if (body.error?.message) {
        return body.error.message
      }
    } catch {
      if (typeof apiError.responseBody === 'string' && apiError.responseBody.length < 200) {
        return apiError.responseBody
      }
    }
  }

  return error.message || '未知错误'
}

/** Recovery hint per failure kind, so the user sees an actionable message
   instead of a raw provider error (P0#6). The specific strategy (backoff,
   retry, switch model) is decided by retry-policy; here we surface it. */
const RECOVERY_HINT: Record<FailureKind, string> = {
  'rate-limited': '请求过于频繁（限流），请稍等片刻后重试。',
  timeout: '响应超时，请检查网络或模型服务后重试。',
  network: '网络连接失败，请检查网络后重试。',
  'model-unavailable': '当前模型不可用或无权限，请在设置中更换可用模型。',
  aborted: '',
  unknown: ''
}

/** Build the user-facing error message: a recovery hint (when the failure kind
   is actionable) followed by the underlying provider detail. */
function describeFailure(error: unknown): string {
  const detail = extractErrorMessage(error)
  const apiError = error as { statusCode?: number; message?: string; name?: string }
  const kind = classifyFailure({
    statusCode: apiError?.statusCode,
    message: apiError?.message ?? detail,
    name: apiError?.name
  })
  const hint = RECOVERY_HINT[kind]
  return hint ? `${hint}\n（详情：${detail}）` : detail
}
