import {
  buildExternalKnowledgeRequest,
  normalizeExternalKnowledgeResponse,
  type ExternalKnowledgeEvidence,
  type ExternalKnowledgeRetrievalResult,
  type ExternalKnowledgeSource
} from '../../shared/external-knowledge'
import { isAllowedEndpoint } from '../../shared/provider-profile'
import { recordEgress } from '../outbound-log'
import { secureSettingsStore } from './secure-settings-store'

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_EVIDENCE_CHARS = 12000
const SAFE_HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,80}$/

interface ExternalKnowledgeServiceOptions {
  fetchImpl?: typeof fetch
  getApiKey?: (sourceId: string) => string
  recordRequest?: typeof recordEgress
}

export class ExternalKnowledgeService {
  private readonly fetchImpl: typeof fetch
  private readonly getApiKey: (sourceId: string) => string
  private readonly recordRequest: typeof recordEgress

  constructor(options: ExternalKnowledgeServiceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.getApiKey =
      options.getApiKey ?? ((sourceId) => secureSettingsStore.getKnowledgeSourceKey(sourceId))
    this.recordRequest = options.recordRequest ?? recordEgress
  }

  async retrieve(
    sources: ExternalKnowledgeSource[],
    query: string,
    abortSignal?: AbortSignal
  ): Promise<ExternalKnowledgeRetrievalResult> {
    const results = await Promise.all(
      sources
        .filter((source) => source.enabled)
        .map(async (source) => {
          try {
            return {
              source,
              evidence: await this.retrieveSource(source, query, abortSignal),
              error: ''
            }
          } catch (error) {
            return {
              source,
              evidence: [] as ExternalKnowledgeEvidence[],
              error: safeErrorMessage(error)
            }
          }
        })
    )

    const evidence: ExternalKnowledgeEvidence[] = []
    let totalChars = 0
    for (const result of results) {
      for (const item of result.evidence) {
        if (evidence.length >= 12 || totalChars >= MAX_TOTAL_EVIDENCE_CHARS) break
        const remaining = MAX_TOTAL_EVIDENCE_CHARS - totalChars
        const text = item.text.slice(0, remaining)
        if (!text) break
        evidence.push({ ...item, text })
        totalChars += text.length
      }
    }

    return {
      evidence,
      errors: results
        .filter((result) => result.error)
        .map((result) => ({
          sourceId: result.source.id,
          sourceName: result.source.name,
          error: result.error
        }))
    }
  }

  async retrieveSource(
    source: ExternalKnowledgeSource,
    query: string,
    abortSignal?: AbortSignal
  ): Promise<ExternalKnowledgeEvidence[]> {
    validateEndpoint(source.endpoint)
    const apiKey = this.getApiKey(source.id)
    const headers = buildHeaders(source, apiKey)
    const body = JSON.stringify(buildExternalKnowledgeRequest(source, query))
    const { signal, cleanup } = boundedSignal(source.timeoutMs, abortSignal)
    let outcome: 'success' | 'failure' = 'failure'
    let errorMessage = ''

    try {
      const response = await this.fetchImpl(source.endpoint, {
        method: 'POST',
        headers,
        body,
        signal,
        redirect: 'error'
      })
      if (!response.ok) throw new Error(`Knowledge API returned HTTP ${response.status}`)
      const raw = await readBoundedResponseText(response)
      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch {
        throw new Error('Knowledge API did not return valid JSON')
      }
      const evidence = normalizeExternalKnowledgeResponse(source, value).slice(0, source.topK)
      outcome = 'success'
      return evidence
    } catch (error) {
      errorMessage = safeErrorMessage(error)
      throw new Error(errorMessage)
    } finally {
      cleanup()
      this.recordRequest({
        categories: ['transcript', 'prompt'],
        reason: 'external-knowledge-retrieval',
        approxBytes: Buffer.byteLength(body, 'utf8'),
        baseURL: source.endpoint,
        outcome,
        ...(errorMessage ? { error: errorMessage } : {}),
        at: Date.now()
      })
    }
  }
}

export const externalKnowledgeService = new ExternalKnowledgeService()

function validateEndpoint(endpoint: string): void {
  if (!isAllowedEndpoint(endpoint)) {
    throw new Error('Knowledge API endpoint must use HTTPS (localhost may use HTTP)')
  }
  const url = new URL(endpoint)
  if (url.username || url.password)
    throw new Error('Knowledge API endpoint cannot contain credentials')
}

function buildHeaders(source: ExternalKnowledgeSource, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json'
  }
  if (source.authType === 'none') return headers
  if (!apiKey) throw new Error('Knowledge API key is not configured')
  if (source.authType === 'bearer') {
    headers.Authorization = `Bearer ${apiKey}`
    return headers
  }
  if (source.authType === 'x-api-key') {
    headers['x-api-key'] = apiKey
    return headers
  }
  const headerName = source.headerName.trim()
  if (!SAFE_HEADER_NAME.test(headerName)) throw new Error('Knowledge API header name is invalid')
  headers[headerName] = apiKey
  return headers
}

function boundedSignal(
  timeoutMs: number,
  parent?: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error('Knowledge API request timed out')),
    timeoutMs
  )
  const abortFromParent = () => controller.abort(parent?.reason)
  if (parent) {
    if (parent.aborted) abortFromParent()
    else parent.addEventListener('abort', abortFromParent, { once: true })
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      parent?.removeEventListener('abort', abortFromParent)
    }
  }
}

async function readBoundedResponseText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error('Knowledge API response is too large')
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_RESPONSE_BYTES) throw new Error('Knowledge API response is too large')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'Knowledge API request timed out or was cancelled'
    return error.message.slice(0, 300)
  }
  return 'Unknown knowledge API error'
}
