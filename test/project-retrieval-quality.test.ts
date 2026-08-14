import { cpSync, mkdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { ProjectKnowledgeService } from '../src/main/services/project-knowledge-service'
import {
  normalizeProjectKnowledgeState,
  retrieveProjectKnowledge
} from '../src/shared/project-knowledge'

const tempDirectory = mkdtempSync(join(tmpdir(), 'penumbra-retrieval-quality-'))
const knowledgePath = join(tempDirectory, 'knowledge.json')
const indexPath = join(tempDirectory, 'project-index.sqlite')
const projectRoot = join(tempDirectory, 'project')
mkdirSync(projectRoot, { recursive: true })
cpSync(resolve(__dirname, '../src'), join(projectRoot, 'src'), { recursive: true })

afterAll(() => rmSync(tempDirectory, { recursive: true, force: true }))

describe('project retrieval quality on the Penumbra repository', () => {
  it('keeps real product and architecture questions in the top six evidence results', async () => {
    const service = new ProjectKnowledgeService(knowledgePath, indexPath)
    await service.importProject(projectRoot, 1)
    const state = normalizeProjectKnowledgeState(JSON.parse(readFileSync(knowledgePath, 'utf8')))
    const cases: Array<{ query: string; expected: string[] }> = [
      {
        query: '实时语音识别检测到面试官问题后，在哪里触发回答生成？',
        expected: ['src/main/services/interview-coach-service.ts']
      },
      {
        query: '本地项目知识是怎么检索并拼进面试回答 prompt 的？',
        expected: [
          'src/main/services/knowledge-retrieval-service.ts',
          'src/main/services/project-knowledge-service.ts',
          'src/main/ai.ts'
        ]
      },
      {
        query: '多显示器截图问答默认截哪个屏幕，display_id 在哪里匹配？',
        expected: ['src/main/take-screenshot.ts']
      },
      {
        query: '配置 API Key 后从服务商拉取模型列表的实现在哪里？',
        expected: [
          'src/main/ai.ts',
          'src/main/shortcuts.ts',
          'src/renderer/src/settings/model-options.ts'
        ]
      },
      {
        query: '文字透明度、图标透明度和窗口透明度分别如何调节？',
        expected: [
          'src/shared/opacity.ts',
          'src/main/shortcuts.ts',
          'src/renderer/src/settings/AppearanceSettingsSection.tsx'
        ]
      },
      {
        query: '问题修订后如何阻止旧回答覆盖新问题？',
        expected: [
          'src/shared/question-machine.ts',
          'src/shared/interview-question-detection.ts',
          'src/main/services/interview-coach-service.ts'
        ]
      },
      {
        query: '先说这句、回答路线和项目证据这些结构化标签在哪里解析？',
        expected: [
          'src/shared/interview-assist-plan.ts',
          'src/renderer/src/coder/interview/StructuredInterviewAssist.tsx'
        ]
      },
      {
        query: '项目索引入库前如何脱敏 API Key 和私钥？',
        expected: ['src/shared/knowledge-redaction.ts']
      },
      {
        query: '外部知识库查询的超时、鉴权和证据转换在哪里处理？',
        expected: [
          'src/main/services/external-knowledge-service.ts',
          'src/shared/external-knowledge.ts'
        ]
      },
      {
        query: 'Qwen realtime ASR 的 WebSocket 音频发送和事件处理在哪里？',
        expected: ['src/main/asr/qwen-realtime-provider.ts', 'src/shared/qwen-realtime-events.ts']
      }
    ]

    let hybridHits = 0
    let legacyHits = 0
    const diagnostics = cases.map((item) => {
      const hybridPaths = service
        .retrieve(item.query)
        .evidence.slice(0, 6)
        .map((evidence) => evidence.chunk.relativePath)
      const legacyPaths = retrieveProjectKnowledge(state, item.query)
        .evidence.slice(0, 6)
        .map((evidence) => evidence.chunk.relativePath)
      const hybridHit = item.expected.some((path) => hybridPaths.includes(path))
      const legacyHit = item.expected.some((path) => legacyPaths.includes(path))
      if (hybridHit) hybridHits += 1
      if (legacyHit) legacyHits += 1
      return {
        query: item.query,
        expected: item.expected,
        hybridPaths,
        legacyPaths,
        hybridHit,
        legacyHit
      }
    })

    service.close()
    expect(
      { hybridHits, legacyHits, diagnostics },
      JSON.stringify(
        diagnostics.filter((item) => !item.hybridHit),
        null,
        2
      )
    ).toEqual(
      expect.objectContaining({
        hybridHits: cases.length
      })
    )
    expect(hybridHits).toBeGreaterThanOrEqual(legacyHits)
  }, 30_000)
})
