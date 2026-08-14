import { describe, expect, it } from 'vitest'
import {
  expandProjectSearchQuery,
  extractProjectIdentifiers,
  fuseProjectSearchRanks,
  rankProjectSourceFiles,
  tokenizeProjectSearch
} from '../src/shared/project-search'
import type { ProjectSourceFile, ProjectSourceRelation } from '../src/shared/project-source-graph'

describe('project search primitives', () => {
  it('tokenizes identifiers and Chinese phrases for dual full-text indexes', () => {
    const tokens = tokenizeProjectSearch(
      '实时语音面试里 startRealtimeAsr 如何进入 question_machine？'
    )

    expect(tokens).toEqual(
      expect.arrayContaining([
        '实时语音面试里',
        '实时',
        '语音',
        '面试',
        'startrealtimeasr',
        'start',
        'realtime',
        'asr',
        'question_machine',
        'question',
        'machine'
      ])
    )
    expect(extractProjectIdentifiers('请解释 startRealtimeAsr 和普通 interview flow')).toEqual([
      'startrealtimeasr'
    ])
    expect(extractProjectIdentifiers('配置 API Key 后拉取模型')).toEqual([])
    expect(expandProjectSearchQuery('文字透明度如何调节')).toContain('opacity')
    expect(expandProjectSearchQuery('文字透明度如何调节')).toContain('adjust')
  })

  it('ranks candidates higher when independent retrievers agree', () => {
    const fused = fuseProjectSearchRanks([
      { source: 'symbol', weight: 2.4, ids: ['symbol-hit', 'only-symbol'] },
      { source: 'fts-raw', weight: 1.2, ids: ['symbol-hit', 'only-raw'] },
      { source: 'fts-terms', weight: 1.1, ids: ['only-raw', 'symbol-hit'] }
    ])

    expect(fused[0].id).toBe('symbol-hit')
    expect(fused[0].sources).toEqual(['symbol', 'fts-raw', 'fts-terms'])
    expect(fused.find((item) => item.id === 'only-raw')?.score).toBeGreaterThan(
      fused.find((item) => item.id === 'only-symbol')?.score ?? 0
    )
  })

  it('personalizes the repo map toward mentioned symbols and their callers', () => {
    const files: ProjectSourceFile[] = [
      {
        relativePath: 'src/main/interview-coach.ts',
        symbols: [{ name: 'runAssist', kind: 'function', line: 10, exported: true }],
        imports: ['./knowledge-retrieval'],
        calls: ['buildInterviewKnowledgePrompt'],
        entrypoint: true
      },
      {
        relativePath: 'src/main/knowledge-retrieval.ts',
        symbols: [
          { name: 'buildInterviewKnowledgePrompt', kind: 'function', line: 4, exported: true }
        ],
        imports: ['./project-index'],
        calls: ['searchProjectIndex'],
        entrypoint: false
      },
      {
        relativePath: 'src/main/project-index.ts',
        symbols: [{ name: 'searchProjectIndex', kind: 'function', line: 20, exported: true }],
        imports: [],
        calls: [],
        entrypoint: false
      },
      {
        relativePath: 'src/renderer/theme.ts',
        symbols: [{ name: 'applyTheme', kind: 'function', line: 1, exported: true }],
        imports: [],
        calls: [],
        entrypoint: false
      }
    ]
    const relations: ProjectSourceRelation[] = [
      {
        kind: 'calls',
        fromPath: 'src/main/interview-coach.ts',
        toPath: 'src/main/knowledge-retrieval.ts',
        symbol: 'buildInterviewKnowledgePrompt'
      },
      {
        kind: 'calls',
        fromPath: 'src/main/knowledge-retrieval.ts',
        toPath: 'src/main/project-index.ts',
        symbol: 'searchProjectIndex'
      }
    ]

    const ranked = rankProjectSourceFiles(
      files,
      relations,
      ['src/main/interview-coach.ts'],
      'buildInterviewKnowledgePrompt 的项目索引链路怎么工作？'
    )

    expect(ranked.slice(0, 3).map((item) => item.relativePath)).toEqual(
      expect.arrayContaining([
        'src/main/interview-coach.ts',
        'src/main/knowledge-retrieval.ts',
        'src/main/project-index.ts'
      ])
    )
    expect(
      ranked.findIndex((item) => item.relativePath === 'src/renderer/theme.ts')
    ).toBeGreaterThan(2)
  })
})
