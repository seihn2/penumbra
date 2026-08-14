import { describe, expect, it } from 'vitest'
import {
  analyzeProjectSourceFile,
  buildProjectSourceGraph
} from '../src/shared/project-source-graph'
import {
  buildProjectKnowledgePrompt,
  chunkProjectFile,
  emptyProjectKnowledgeState,
  retrieveProjectKnowledge
} from '../src/shared/project-knowledge'

describe('project source graph', () => {
  it('maps entrypoints, imports, and cross-file calls', () => {
    const sourceFiles = [
      analyzeProjectSourceFile({
        relativePath: 'src/main/index.ts',
        content:
          "import { startTranscription } from './transcription'\nexport function bootstrap() {\n  startTranscription()\n}"
      }),
      analyzeProjectSourceFile({
        relativePath: 'src/main/transcription.ts',
        content:
          "import { processFinalInterviewTurn } from '../shared/question-machine'\nexport function startTranscription() {\n  return processFinalInterviewTurn()\n}"
      }),
      analyzeProjectSourceFile({
        relativePath: 'src/shared/question-machine.ts',
        content: 'export function processFinalInterviewTurn() {\n  return true\n}'
      })
    ]

    const graph = buildProjectSourceGraph(sourceFiles)

    expect(graph.entrypoints).toContain('src/main/index.ts')
    expect(graph.relations).toEqual(
      expect.arrayContaining([
        {
          kind: 'imports',
          fromPath: 'src/main/index.ts',
          toPath: 'src/main/transcription.ts'
        },
        {
          kind: 'calls',
          fromPath: 'src/main/transcription.ts',
          toPath: 'src/shared/question-machine.ts',
          symbol: 'processFinalInterviewTurn'
        }
      ])
    )
  })

  it('expands lexical retrieval with related source files from the call graph', () => {
    const files = [
      {
        relativePath: 'src/main/transcription.ts',
        content:
          "import { processFinalInterviewTurn } from '../shared/question-machine'\nexport function startRealtimeAsr() {\n  return processFinalInterviewTurn()\n}"
      },
      {
        relativePath: 'src/shared/question-machine.ts',
        content:
          'export function processFinalInterviewTurn() {\n  return transitionQuestionState()\n}\n\nfunction transitionQuestionState() {\n  return true\n}'
      }
    ]
    const sourceFiles = files.map(analyzeProjectSourceFile)
    const graph = buildProjectSourceGraph(sourceFiles)
    const state = {
      ...emptyProjectKnowledgeState(),
      projects: [
        {
          id: 'p1',
          name: 'Penumbra',
          rootPath: '/tmp/penumbra',
          indexedAt: 1,
          fileCount: files.length,
          chunks: files.flatMap((file) => chunkProjectFile({ projectId: 'p1', ...file })),
          sourceFiles,
          entrypoints: graph.entrypoints,
          relations: graph.relations
        }
      ]
    }

    const retrieval = retrieveProjectKnowledge(state, '实时 ASR 是怎么启动的？')
    const prompt = buildProjectKnowledgePrompt(retrieval)

    expect(retrieval.evidence.map((item) => item.chunk.relativePath)).toContain(
      'src/shared/question-machine.ts'
    )
    expect(prompt).toContain('[PROJECT_SOURCE_MAP]')
    expect(prompt).toContain(
      'src/main/transcription.ts -> processFinalInterviewTurn -> src/shared/question-machine.ts'
    )
  })
})
