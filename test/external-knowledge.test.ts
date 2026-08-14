import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '' },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf8')
  }
}))
vi.mock('../src/main/outbound-log', () => ({ recordEgress: vi.fn() }))

import {
  buildExternalKnowledgeRequest,
  normalizeExternalKnowledgeResponse,
  type ExternalKnowledgeSource
} from '../src/shared/external-knowledge'
import { ExternalKnowledgeService } from '../src/main/services/external-knowledge-service'

function source(overrides: Partial<ExternalKnowledgeSource> = {}): ExternalKnowledgeSource {
  return {
    id: 'kb-1',
    name: 'Project KB',
    endpoint: 'https://kb.example.com/retrieve',
    enabled: true,
    protocol: 'generic-json',
    role: 'project-fact',
    authType: 'bearer',
    headerName: 'Authorization',
    namespace: 'project-42',
    topK: 5,
    timeoutMs: 2500,
    queryField: 'input.question',
    limitField: 'retrieval.top_k',
    namespaceField: 'filters.space_id',
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

describe('external knowledge protocol', () => {
  it('builds a configurable generic JSON request without dumping unrelated state', () => {
    expect(buildExternalKnowledgeRequest(source(), '实时语音链路')).toEqual({
      input: { question: '实时语音链路' },
      retrieval: { top_k: 5 },
      filters: { space_id: 'project-42' }
    })
  })

  it('builds the Dify retrieval request shape', () => {
    expect(
      buildExternalKnowledgeRequest(source({ protocol: 'dify', namespace: '' }), '架构取舍')
    ).toEqual({
      query: '架构取舍',
      retrieval_model: {
        search_method: 'hybrid_search',
        reranking_enable: false,
        top_k: 5,
        score_threshold_enabled: false
      }
    })
  })

  it('normalizes Dify records into traceable evidence and redacts secrets', () => {
    const evidence = normalizeExternalKnowledgeResponse(source({ protocol: 'dify' }), {
      records: [
        {
          score: 0.91,
          segment: {
            content: '服务使用 api_key = "sk-should-not-leak"，通过双音源接入。',
            document: { name: 'voice-design.md' }
          }
        }
      ]
    })

    expect(evidence).toEqual([
      expect.objectContaining({
        sourceName: 'Project KB',
        role: 'project-fact',
        title: 'voice-design.md',
        score: 0.91
      })
    ])
    expect(evidence[0].text).toContain('[REDACTED]')
    expect(evidence[0].text).not.toContain('sk-should-not-leak')
  })
})

describe('ExternalKnowledgeService', () => {
  it('sends a short authenticated query and returns normalized evidence', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.redirect).toBe('error')
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer kb-secret' })
      expect(JSON.parse(String(init?.body))).toEqual({
        input: { question: '怎么做实时辅助？' },
        retrieval: { top_k: 5 },
        filters: { space_id: 'project-42' }
      })
      return new Response(
        JSON.stringify({
          results: [
            {
              content: '先识别完整问题，再检索相关源码证据。',
              title: 'Realtime Assist',
              path: 'docs/realtime.md',
              score: 0.88
            }
          ]
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    }) as typeof fetch
    const recordRequest = vi.fn()
    const service = new ExternalKnowledgeService({
      fetchImpl,
      getApiKey: () => 'kb-secret',
      recordRequest
    })

    const evidence = await service.retrieveSource(source(), '怎么做实时辅助？')

    expect(evidence).toHaveLength(1)
    expect(evidence[0]).toMatchObject({
      title: 'Realtime Assist',
      locator: 'docs/realtime.md',
      text: '先识别完整问题，再检索相关源码证据。'
    })
    expect(recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['transcript', 'prompt'],
        reason: 'external-knowledge-retrieval',
        outcome: 'success'
      })
    )
  })

  it('rejects insecure remote endpoints before sending a key', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const service = new ExternalKnowledgeService({
      fetchImpl,
      getApiKey: () => 'kb-secret',
      recordRequest: vi.fn()
    })

    await expect(
      service.retrieveSource(source({ endpoint: 'http://kb.example.com/retrieve' }), 'question')
    ).rejects.toThrow('must use HTTPS')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
