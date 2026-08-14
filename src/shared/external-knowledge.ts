import { redactKnowledgeSecrets } from './knowledge-redaction'

export const EXTERNAL_KNOWLEDGE_PROTOCOLS = ['generic-json', 'dify'] as const
export type ExternalKnowledgeProtocol = (typeof EXTERNAL_KNOWLEDGE_PROTOCOLS)[number]

export const EXTERNAL_KNOWLEDGE_ROLES = [
  'project-fact',
  'candidate-profile',
  'user-voice',
  'reference'
] as const
export type ExternalKnowledgeRole = (typeof EXTERNAL_KNOWLEDGE_ROLES)[number]

export const EXTERNAL_KNOWLEDGE_AUTH_TYPES = [
  'none',
  'bearer',
  'x-api-key',
  'custom-header'
] as const
export type ExternalKnowledgeAuthType = (typeof EXTERNAL_KNOWLEDGE_AUTH_TYPES)[number]

export interface ExternalKnowledgeTestResult {
  ok: boolean
  at: number
  evidenceCount?: number
  error?: string
}

export interface ExternalKnowledgeSource {
  id: string
  name: string
  endpoint: string
  enabled: boolean
  protocol: ExternalKnowledgeProtocol
  role: ExternalKnowledgeRole
  authType: ExternalKnowledgeAuthType
  headerName: string
  namespace: string
  topK: number
  timeoutMs: number
  queryField: string
  limitField: string
  namespaceField: string
  createdAt: number
  updatedAt: number
  lastTest?: ExternalKnowledgeTestResult
}

export interface ExternalKnowledgeSourceInput {
  id?: string
  name: string
  endpoint: string
  enabled: boolean
  protocol: ExternalKnowledgeProtocol
  role: ExternalKnowledgeRole
  authType: ExternalKnowledgeAuthType
  headerName?: string
  namespace?: string
  topK?: number
  timeoutMs?: number
  queryField?: string
  limitField?: string
  namespaceField?: string
}

export interface ExternalKnowledgeSourceOverview extends ExternalKnowledgeSource {
  keyConfigured: boolean
  maskedKey: string
}

export interface KnowledgeEvidence {
  sourceId: string
  sourceName: string
  role: ExternalKnowledgeRole
  title: string
  locator: string
  text: string
  score?: number
}

export type ExternalKnowledgeEvidence = KnowledgeEvidence

export interface ExternalKnowledgeRetrievalResult {
  evidence: ExternalKnowledgeEvidence[]
  errors: Array<{ sourceId: string; sourceName: string; error: string }>
}

export type ExternalKnowledgeTestActionResult =
  | {
      ok: true
      evidenceCount: number
      overview: import('./project-knowledge').ProjectKnowledgeOverview
    }
  | { ok: false; error: string; overview: import('./project-knowledge').ProjectKnowledgeOverview }

export const EXTERNAL_KNOWLEDGE_DEFAULTS = {
  protocol: 'generic-json' as ExternalKnowledgeProtocol,
  role: 'project-fact' as ExternalKnowledgeRole,
  authType: 'bearer' as ExternalKnowledgeAuthType,
  headerName: 'Authorization',
  namespace: '',
  topK: 5,
  timeoutMs: 2500,
  queryField: 'query',
  limitField: 'top_k',
  namespaceField: 'space_id'
}

const MAX_EVIDENCE_TEXT_CHARS = 4000
const MAX_NORMALIZED_EVIDENCE = 12
const SAFE_FIELD_PATH = /^[A-Za-z_][A-Za-z0-9_.-]{0,119}$/

export function buildExternalKnowledgeRequest(
  source: ExternalKnowledgeSource,
  query: string
): Record<string, unknown> {
  const topK = clampInteger(source.topK, 1, 10, EXTERNAL_KNOWLEDGE_DEFAULTS.topK)
  if (source.protocol === 'dify') {
    return {
      query,
      retrieval_model: {
        search_method: 'hybrid_search',
        reranking_enable: false,
        top_k: topK,
        score_threshold_enabled: false
      }
    }
  }

  const body: Record<string, unknown> = {}
  setFieldPath(body, safeFieldPath(source.queryField, 'query'), query)
  setFieldPath(body, safeFieldPath(source.limitField, 'top_k'), topK)
  if (source.namespace.trim()) {
    setFieldPath(body, safeFieldPath(source.namespaceField, 'space_id'), source.namespace.trim())
  }
  return body
}

export function normalizeExternalKnowledgeResponse(
  source: ExternalKnowledgeSource,
  value: unknown
): ExternalKnowledgeEvidence[] {
  const records = findRecordArray(value)
  if (!records) throw new Error('Knowledge API response does not contain a supported result array')

  const evidence: ExternalKnowledgeEvidence[] = []
  const seen = new Set<string>()
  for (const record of records) {
    const normalized = normalizeRecord(source, record)
    if (!normalized) continue
    const dedupeKey = `${normalized.locator}\n${normalized.text}`.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    evidence.push(normalized)
    if (evidence.length >= MAX_NORMALIZED_EVIDENCE) break
  }
  return evidence
}

export function isExternalKnowledgeSource(value: unknown): value is ExternalKnowledgeSource {
  if (!value || typeof value !== 'object') return false
  const source = value as Partial<ExternalKnowledgeSource>
  return (
    typeof source.id === 'string' &&
    typeof source.name === 'string' &&
    typeof source.endpoint === 'string' &&
    typeof source.enabled === 'boolean' &&
    EXTERNAL_KNOWLEDGE_PROTOCOLS.includes(source.protocol as ExternalKnowledgeProtocol) &&
    EXTERNAL_KNOWLEDGE_ROLES.includes(source.role as ExternalKnowledgeRole) &&
    EXTERNAL_KNOWLEDGE_AUTH_TYPES.includes(source.authType as ExternalKnowledgeAuthType) &&
    typeof source.headerName === 'string' &&
    typeof source.namespace === 'string' &&
    typeof source.topK === 'number' &&
    typeof source.timeoutMs === 'number' &&
    typeof source.queryField === 'string' &&
    typeof source.limitField === 'string' &&
    typeof source.namespaceField === 'string' &&
    typeof source.createdAt === 'number' &&
    typeof source.updatedAt === 'number'
  )
}

function normalizeRecord(
  source: ExternalKnowledgeSource,
  value: unknown
): ExternalKnowledgeEvidence | null {
  if (typeof value === 'string') {
    const text = cleanEvidenceText(value)
    return text
      ? {
          sourceId: source.id,
          sourceName: source.name,
          role: source.role,
          title: source.name,
          locator: '',
          text
        }
      : null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const segment = asRecord(record.segment)
  const document = asRecord(record.document) ?? asRecord(segment?.document)
  const metadata =
    asRecord(record.metadata) ?? asRecord(record.meta) ?? asRecord(segment?.metadata) ?? {}
  const payload = asRecord(record.payload) ?? asRecord(record._source) ?? {}
  const text = cleanEvidenceText(
    firstString(
      record.text,
      record.content,
      record.snippet,
      record.pageContent,
      record.answer,
      segment?.content,
      segment?.text,
      document?.content,
      payload.text,
      payload.content,
      metadata.text,
      metadata.content
    )
  )
  if (!text) return null

  const title =
    firstString(
      record.title,
      record.name,
      record.documentName,
      document?.name,
      document?.title,
      metadata.title,
      metadata.name,
      metadata.file_name,
      metadata.filename
    ) || source.name
  const locator = firstString(
    record.url,
    record.uri,
    record.source,
    record.path,
    record.file,
    document?.url,
    document?.path,
    metadata.url,
    metadata.uri,
    metadata.source,
    metadata.path,
    metadata.file
  )
  const score = firstFiniteNumber(
    record.score,
    record.similarity,
    record.relevance,
    segment?.score,
    metadata.score
  )

  return {
    sourceId: source.id,
    sourceName: source.name,
    role: source.role,
    title,
    locator,
    text,
    ...(score === undefined ? {} : { score })
  }
}

function findRecordArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  const root = asRecord(value)
  if (!root) return null
  const directKeys = ['results', 'records', 'items', 'documents', 'matches', 'chunks']
  for (const key of directKeys) {
    if (Array.isArray(root[key])) return root[key] as unknown[]
  }
  if (Array.isArray(root.data)) return root.data
  const data = asRecord(root.data)
  if (data) {
    for (const key of directKeys) {
      if (Array.isArray(data[key])) return data[key] as unknown[]
    }
  }
  return null
}

function setFieldPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.')
  let current = target
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    const next = asRecord(current[segment]) ?? {}
    current[segment] = next
    current = next
  }
  current[segments[segments.length - 1]] = value
}

function safeFieldPath(value: string, fallback: string): string {
  const trimmed = value.trim()
  return SAFE_FIELD_PATH.test(trimmed) ? trimmed : fallback
}

function cleanEvidenceText(value: string): string {
  return redactKnowledgeSecrets(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_EVIDENCE_TEXT_CHARS)
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}
