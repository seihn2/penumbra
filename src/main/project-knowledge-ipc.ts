import { dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { projectKnowledgeService } from './services/project-knowledge-service'
import type { ProjectKnowledgeActionResult } from '../shared/project-knowledge'
import {
  EXTERNAL_KNOWLEDGE_AUTH_TYPES,
  EXTERNAL_KNOWLEDGE_PROTOCOLS,
  EXTERNAL_KNOWLEDGE_ROLES,
  type ExternalKnowledgeSourceInput,
  type ExternalKnowledgeTestActionResult
} from '../shared/external-knowledge'
import { isAllowedEndpoint } from '../shared/provider-profile'
import { maskSecret } from '../shared/secret-lifecycle'
import { externalKnowledgeService } from './services/external-knowledge-service'
import { secureSettingsStore } from './services/secure-settings-store'

const idSchema = z.string().min(1).max(200)
const answerPolicySchema = z
  .object({
    id: idSchema.optional(),
    question: z.string().min(1).max(4000),
    answer: z.string().min(1).max(30000)
  })
  .strict()
const answerPolicyQuestionSchema = z.string().min(1).max(4000)
const fieldPathSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z_][A-Za-z0-9_.-]*$/)
const externalSourceSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(1).max(120),
    endpoint: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .refine(isAllowedEndpoint, 'Knowledge API endpoint must use HTTPS'),
    enabled: z.boolean(),
    protocol: z.enum(EXTERNAL_KNOWLEDGE_PROTOCOLS),
    role: z.enum(EXTERNAL_KNOWLEDGE_ROLES),
    authType: z.enum(EXTERNAL_KNOWLEDGE_AUTH_TYPES),
    headerName: z.string().trim().max(80).optional(),
    namespace: z.string().trim().max(500).optional(),
    topK: z.number().int().min(1).max(10).optional(),
    timeoutMs: z.number().int().min(500).max(8000).optional(),
    queryField: fieldPathSchema.optional(),
    limitField: fieldPathSchema.optional(),
    namespaceField: fieldPathSchema.optional()
  })
  .strict()
const externalSourceSaveSchema = z
  .object({
    source: externalSourceSchema,
    apiKey: z.string().min(1).max(20000).optional()
  })
  .strict()
const externalSourceToggleSchema = z.object({ sourceId: idSchema, enabled: z.boolean() }).strict()

function overview() {
  const current = projectKnowledgeService.overview()
  return {
    ...current,
    externalSources: current.externalSources.map((source) => {
      const apiKey = secureSettingsStore.getKnowledgeSourceKey(source.id)
      return {
        ...source,
        keyConfigured: Boolean(apiKey),
        maskedKey: apiKey ? maskSecret(apiKey) : ''
      }
    })
  }
}

function action(run: () => unknown): ProjectKnowledgeActionResult {
  try {
    run()
    return { ok: true, overview: overview() }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown' }
  }
}

async function asyncAction(run: () => Promise<unknown>): Promise<ProjectKnowledgeActionResult> {
  try {
    await run()
    return { ok: true, overview: overview() }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown' }
  }
}

ipcMain.handle('project-knowledge-list', () => overview())

ipcMain.handle(
  'project-knowledge-import',
  async (): Promise<ProjectKnowledgeActionResult | null> => {
    const result = await dialog.showOpenDialog({
      title: '选择项目代码目录',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return asyncAction(() => projectKnowledgeService.importProject(result.filePaths[0]))
  }
)

ipcMain.handle(
  'project-knowledge-reindex',
  async (_event, value): Promise<ProjectKnowledgeActionResult> => {
    const projectId = idSchema.parse(value)
    return asyncAction(() => projectKnowledgeService.reindexProject(projectId))
  }
)

ipcMain.handle('project-knowledge-remove', (_event, value): ProjectKnowledgeActionResult => {
  const projectId = idSchema.parse(value)
  return action(() => projectKnowledgeService.removeProject(projectId))
})

ipcMain.handle(
  'project-knowledge-document-import',
  async (_event, value): Promise<ProjectKnowledgeActionResult | null> => {
    const role = z.enum(EXTERNAL_KNOWLEDGE_ROLES).parse(value)
    const result = await dialog.showOpenDialog({
      title: '选择简历、聊天记录或项目材料',
      properties: ['openFile'],
      filters: [
        { name: 'Knowledge documents', extensions: ['txt', 'md', 'markdown', 'json', 'pdf'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return asyncAction(() => projectKnowledgeService.importDocument(result.filePaths[0], role))
  }
)

ipcMain.handle(
  'project-knowledge-document-reindex',
  async (_event, value): Promise<ProjectKnowledgeActionResult> => {
    const documentId = idSchema.parse(value)
    return asyncAction(() => projectKnowledgeService.reindexDocument(documentId))
  }
)

ipcMain.handle(
  'project-knowledge-document-remove',
  (_event, value): ProjectKnowledgeActionResult => {
    const documentId = idSchema.parse(value)
    return action(() => projectKnowledgeService.removeDocument(documentId))
  }
)

ipcMain.handle('interview-answer-policy-save', (_event, value) => {
  const input = answerPolicySchema.parse(value)
  return projectKnowledgeService.saveAnswerPolicy(input)
})

ipcMain.handle('interview-answer-policy-match', (_event, value) => {
  const question = answerPolicyQuestionSchema.parse(value)
  return projectKnowledgeService.findAnswerPolicy(question)
})

ipcMain.handle('interview-answer-policy-delete', (_event, value): ProjectKnowledgeActionResult => {
  const policyId = idSchema.parse(value)
  return action(() => projectKnowledgeService.deleteAnswerPolicy(policyId))
})

ipcMain.handle('external-knowledge-source-save', (_event, value): ProjectKnowledgeActionResult => {
  const input = externalSourceSaveSchema.parse(value) as {
    source: ExternalKnowledgeSourceInput
    apiKey?: string
  }
  return action(() => {
    const previous = input.source.id
      ? projectKnowledgeService.getExternalSource(input.source.id)
      : null
    const source = projectKnowledgeService.saveExternalSource(input.source)
    const endpointChanged = previous != null && previous.endpoint !== source.endpoint
    if (source.authType === 'none') {
      secureSettingsStore.deleteKnowledgeSourceKey(source.id)
    } else if (input.apiKey) {
      secureSettingsStore.saveKnowledgeSourceKey(source.id, input.apiKey)
    } else if (endpointChanged) {
      secureSettingsStore.deleteKnowledgeSourceKey(source.id)
    }
  })
})

ipcMain.handle(
  'external-knowledge-source-toggle',
  (_event, value): ProjectKnowledgeActionResult => {
    const input = externalSourceToggleSchema.parse(value)
    return action(() =>
      projectKnowledgeService.setExternalSourceEnabled(input.sourceId, input.enabled)
    )
  }
)

ipcMain.handle(
  'external-knowledge-source-delete',
  (_event, value): ProjectKnowledgeActionResult => {
    const sourceId = idSchema.parse(value)
    return action(() => {
      projectKnowledgeService.removeExternalSource(sourceId)
      secureSettingsStore.deleteKnowledgeSourceKey(sourceId)
    })
  }
)

ipcMain.handle(
  'external-knowledge-source-test',
  async (_event, value): Promise<ExternalKnowledgeTestActionResult> => {
    const sourceId = idSchema.parse(value)
    const source = projectKnowledgeService.getExternalSource(sourceId)
    if (!source) return { ok: false, error: 'Knowledge source not found', overview: overview() }
    try {
      const evidence = await externalKnowledgeService.retrieveSource(source, '项目架构与实现细节')
      projectKnowledgeService.recordExternalSourceTest(sourceId, {
        ok: true,
        at: Date.now(),
        evidenceCount: evidence.length
      })
      return { ok: true, evidenceCount: evidence.length, overview: overview() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      projectKnowledgeService.recordExternalSourceTest(sourceId, {
        ok: false,
        at: Date.now(),
        error: message
      })
      return { ok: false, error: message, overview: overview() }
    }
  }
)
