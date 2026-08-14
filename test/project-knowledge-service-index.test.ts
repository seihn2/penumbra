import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectKnowledgeService } from '../src/main/services/project-knowledge-service'

const tempDirs: string[] = []

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('ProjectKnowledgeService hybrid index integration', () => {
  it('indexes with Tree-sitter, reuses unchanged files, and refreshes changed evidence', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'penumbra-project-service-'))
    tempDirs.push(directory)
    const projectRoot = join(directory, 'sample-project')
    mkdirSync(join(projectRoot, 'src'), { recursive: true })
    writeFileSync(
      join(projectRoot, 'src', 'interview-coach.ts'),
      "import { processQuestionTurn } from './question-machine'\nexport function startRealtimeAsr() {\n  return processQuestionTurn()\n}\n",
      'utf8'
    )
    writeFileSync(
      join(projectRoot, 'src', 'question-machine.ts'),
      'export function processQuestionTurn() {\n  // 合并半句话，避免面试提示频繁刷新\n  return transitionQuestionState()\n}\n\nfunction transitionQuestionState() {\n  return true\n}\n',
      'utf8'
    )
    writeFileSync(
      join(projectRoot, 'src', 'theme.ts'),
      'export function applyTheme() {\n  return "dark"\n}\n',
      'utf8'
    )

    const service = new ProjectKnowledgeService(
      join(directory, 'knowledge.json'),
      join(directory, 'project-index.sqlite')
    )
    const firstOverview = await service.importProject(projectRoot, 100)
    const projectId = firstOverview.projects[0].id

    expect(service.lastIndexingStats(projectId)).toEqual({
      parsedFiles: 3,
      reusedFiles: 0,
      treeSitterFiles: 3,
      fallbackFiles: 0
    })
    const firstRetrieval = service.retrieve('实时 ASR 如何进入问题状态机并避免提示频繁刷新？')
    expect(firstRetrieval.evidence.map((item) => item.chunk.relativePath)).toEqual(
      expect.arrayContaining(['src/interview-coach.ts', 'src/question-machine.ts'])
    )
    expect(
      firstRetrieval.evidence.find((item) => item.chunk.relativePath === 'src/question-machine.ts')
        ?.sources
    ).toEqual(expect.arrayContaining(['fts-terms']))

    await service.reindexProject(projectId, 200)
    expect(service.lastIndexingStats(projectId)).toEqual({
      parsedFiles: 0,
      reusedFiles: 3,
      treeSitterFiles: 0,
      fallbackFiles: 0
    })

    writeFileSync(
      join(projectRoot, 'src', 'question-machine.ts'),
      'export function processQuestionTurn() {\n  // 使用语义去抖稳定最终问题\n  return stabilizeQuestionRevision()\n}\n\nfunction stabilizeQuestionRevision() {\n  return true\n}\n',
      'utf8'
    )
    await service.reindexProject(projectId, 300)

    expect(service.lastIndexingStats(projectId)).toEqual({
      parsedFiles: 1,
      reusedFiles: 2,
      treeSitterFiles: 1,
      fallbackFiles: 0
    })
    expect(service.retrieve('stabilizeQuestionRevision 在哪里实现？').evidence[0]).toEqual(
      expect.objectContaining({
        chunk: expect.objectContaining({ relativePath: 'src/question-machine.ts' }),
        sources: expect.arrayContaining(['symbol'])
      })
    )
    const staleSymbolResults = service.retrieve('transitionQuestionState 在哪里实现？').evidence
    expect(
      staleSymbolResults.some(
        (item) =>
          item.chunk.symbol === 'transitionQuestionState' ||
          item.chunk.text.includes('transitionQuestionState')
      )
    ).toBe(false)
    expect(staleSymbolResults.every((item) => !item.sources?.includes('symbol'))).toBe(true)
    service.close()
  })
})
