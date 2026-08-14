import { buildProjectKnowledgePrompt } from '../../shared/project-knowledge'
import { externalKnowledgeService } from './external-knowledge-service'
import { projectKnowledgeService } from './project-knowledge-service'

export async function buildInterviewKnowledgePrompt(
  query: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const local = projectKnowledgeService.retrieve(query)
  const external = await externalKnowledgeService.retrieve(
    projectKnowledgeService.enabledExternalSources(),
    query,
    abortSignal
  )
  return buildProjectKnowledgePrompt({ ...local, externalEvidence: external.evidence })
}
