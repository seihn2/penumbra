import type { BrowserWindow } from 'electron'
import { withFirstChunkTimeout } from '../../shared/stream-timeout'
import { classifyFailure, decideRecovery, type FailureKind } from '../../shared/retry-policy'

export type AbortReason = 'user' | 'new-request'

// If the model sends no first token within this long, treat it as a stalled
// provider: abort and surface an error instead of spinning "生成中" forever.
const FIRST_CHUNK_TIMEOUT_MS = 30000
const MAX_STREAM_ATTEMPTS = 2

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
  firstChunkTimeoutMs?: number
  maxAttempts?: number
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
    const {
      window,
      streamContext,
      createStream,
      errorPrefix,
      onComplete,
      onFinally,
      firstChunkTimeoutMs = FIRST_CHUNK_TIMEOUT_MS,
      maxAttempts = MAX_STREAM_ATTEMPTS
    } = options
    let assistantResponse = ''
    let completed = false

    try {
      for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
        if (streamContext.controller.signal.aborted) break

        const attemptController = new AbortController()
        const unlinkAbort = forwardAbort(streamContext.controller.signal, attemptController)
        let emittedOnAttempt = false

        try {
          const textStream = createStream(attemptController.signal)
          const guardedStream = withFirstChunkTimeout(
            textStream,
            firstChunkTimeoutMs,
            attemptController
          )

          for await (const chunk of guardedStream) {
            if (streamContext.controller.signal.aborted) break
            emittedOnAttempt = true
            assistantResponse += chunk
            window.webContents.send('solution-chunk', chunk)
          }

          if (!streamContext.controller.signal.aborted) completed = true
          break
        } catch (error) {
          if (streamContext.controller.signal.aborted) break

          const kind = classifyStreamFailure(error)
          const recovery = emittedOnAttempt
            ? { kind: 'give-up' as const, reason: 'partial-output' }
            : decideRecovery(kind, {
                attempt,
                maxAttempts: Math.max(1, maxAttempts)
              })

          if (recovery.kind === 'retry-now' || recovery.kind === 'retry-after') {
            const delayMs = recovery.kind === 'retry-after' ? recovery.delayMs : 0
            console.warn(`${errorPrefix} retrying after ${kind} failure (attempt ${attempt})`)
            await waitForRetry(delayMs, streamContext.controller.signal)
            continue
          }

          console.error(errorPrefix, error)
          window.webContents.send(
            'solution-error',
            isTimeoutError(error) ? AI_TIMEOUT_MESSAGE : describeFailure(error)
          )
          break
        } finally {
          unlinkAbort()
        }
      }

      if (streamContext.controller.signal.aborted) {
        if (streamContext.reason === 'user') window.webContents.send('solution-stopped')
      } else if (completed) {
        onComplete?.(assistantResponse)
        window.webContents.send('solution-complete')
      }
    } finally {
      if (this.currentStreamContext === streamContext) {
        this.currentStreamContext = null
      }
      onFinally?.()
    }
  }
}

const AI_TIMEOUT_MESSAGE = 'AI 响应超时：服务长时间无响应，请检查网络或模型服务后重试。'

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'AI_STREAM_TIMEOUT'
}

function classifyStreamFailure(error: unknown): FailureKind {
  const detail = extractErrorMessage(error)
  const apiError = error as {
    statusCode?: number
    status?: number
    message?: string
    name?: string
  }
  return classifyFailure({
    statusCode: apiError?.statusCode ?? apiError?.status,
    message: apiError?.message ?? detail,
    name: apiError?.name
  })
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
  const kind = classifyStreamFailure(error)
  const hint = RECOVERY_HINT[kind]
  return hint ? `${hint}\n（详情：${detail}）` : detail
}

function forwardAbort(parent: AbortSignal, child: AbortController): () => void {
  const abort = () => child.abort()
  if (parent.aborted) {
    abort()
    return () => undefined
  }
  parent.addEventListener('abort', abort, { once: true })
  return () => parent.removeEventListener('abort', abort)
}

async function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (delayMs <= 0 || signal.aborted) return
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, delayMs)
    signal.addEventListener('abort', done, { once: true })
  })
}
