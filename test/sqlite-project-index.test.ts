import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SqliteProjectIndex } from '../src/main/services/project-index/sqlite-project-index'
import { chunkProjectFile, type ProjectKnowledgeProject } from '../src/shared/project-knowledge'
import {
  analyzeProjectSourceFile,
  buildProjectSourceGraph
} from '../src/shared/project-source-graph'

const tempDirs: string[] = []

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('SqliteProjectIndex', () => {
  it('combines exact symbol, raw FTS, Chinese terms, and repo-map ranking', () => {
    const directory = mkdtempSync(join(tmpdir(), 'penumbra-sqlite-index-'))
    tempDirs.push(directory)
    const index = new SqliteProjectIndex(join(directory, 'project-index.sqlite'))
    const project = projectFixture()

    index.replaceProject(project, [
      fingerprint('src/main/interview-coach.ts', 'coach-hash'),
      fingerprint('src/shared/question-machine.ts', 'question-hash'),
      fingerprint('src/renderer/theme.ts', 'theme-hash')
    ])

    const symbolResults = index.search([project], 'startRealtimeAsr 在哪里启动？', 6)
    expect(symbolResults[0].chunk.relativePath).toBe('src/main/interview-coach.ts')
    expect(symbolResults[0].sources).toContain('symbol')

    const chineseResults = index.search([project], '问题状态机怎么避免面试提示频繁刷新？', 6)
    expect(chineseResults.slice(0, 3).map((item) => item.chunk.relativePath)).toContain(
      'src/shared/question-machine.ts'
    )
    expect(
      chineseResults.find((item) => item.chunk.relativePath === 'src/shared/question-machine.ts')
        ?.sources
    ).toContain('fts-terms')

    const flowResults = index.search([project], '实时语音识别如何进入问题状态机？', 6)
    expect(flowResults.map((item) => item.chunk.relativePath)).toEqual(
      expect.arrayContaining(['src/main/interview-coach.ts', 'src/shared/question-machine.ts'])
    )
    index.close()
  })

  it('stores file fingerprints and removes stale project rows on replacement', () => {
    const directory = mkdtempSync(join(tmpdir(), 'penumbra-sqlite-index-'))
    tempDirs.push(directory)
    const index = new SqliteProjectIndex(join(directory, 'project-index.sqlite'))
    const project = projectFixture()
    index.replaceProject(project, [fingerprint('src/main/interview-coach.ts', 'old-hash')])

    expect(index.fileFingerprint(project.id, 'src/main/interview-coach.ts')).toEqual(
      expect.objectContaining({ sha256: 'old-hash', size: 100 })
    )

    const replacement = projectFixture().projectsWithoutTheme
    index.replaceProject(replacement, [fingerprint('src/main/interview-coach.ts', 'new-hash')])

    expect(index.fileFingerprint(project.id, 'src/main/interview-coach.ts')?.sha256).toBe(
      'new-hash'
    )
    expect(index.search([replacement], 'applyTheme', 5)).toEqual([])
    index.close()
  })
})

function projectFixture(): ProjectKnowledgeProject & {
  projectsWithoutTheme: ProjectKnowledgeProject
} {
  const files = [
    {
      relativePath: 'src/main/interview-coach.ts',
      content:
        "import { processFinalInterviewTurn } from '../shared/question-machine'\nexport function startRealtimeAsr() {\n  return processFinalInterviewTurn()\n}"
    },
    {
      relativePath: 'src/shared/question-machine.ts',
      content:
        'export function processFinalInterviewTurn() {\n  // 问题状态机合并半句话，避免面试提示频繁刷新\n  return transitionQuestionState()\n}\n\nfunction transitionQuestionState() {\n  return true\n}'
    },
    {
      relativePath: 'src/renderer/theme.ts',
      content: 'export function applyTheme() {\n  return "dark"\n}'
    }
  ]
  const sourceFiles = files.map(analyzeProjectSourceFile)
  const graph = buildProjectSourceGraph(sourceFiles)
  const project: ProjectKnowledgeProject = {
    id: 'project-1',
    name: 'Penumbra',
    rootPath: '/Users/demo/penumbra',
    indexedAt: 1,
    fileCount: files.length,
    chunks: files.flatMap((file) => chunkProjectFile({ projectId: 'project-1', ...file })),
    sourceFiles,
    entrypoints: graph.entrypoints,
    relations: graph.relations
  }
  const keptPaths = new Set(['src/main/interview-coach.ts', 'src/shared/question-machine.ts'])
  const keptFiles = project.sourceFiles.filter((file) => keptPaths.has(file.relativePath))
  const keptGraph = buildProjectSourceGraph(keptFiles)
  return Object.assign(project, {
    projectsWithoutTheme: {
      ...project,
      fileCount: keptFiles.length,
      chunks: project.chunks.filter((chunk) => keptPaths.has(chunk.relativePath)),
      sourceFiles: keptFiles,
      entrypoints: keptGraph.entrypoints,
      relations: keptGraph.relations
    }
  })
}

function fingerprint(relativePath: string, sha256: string) {
  return {
    relativePath,
    mtimeMs: 10,
    size: 100,
    sha256,
    language: 'typescript'
  }
}
