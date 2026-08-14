import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(__dirname, `../${path}`), 'utf8')
}

describe('automatic interview-question wiring', () => {
  it('bridges detected questions from main to the renderer store', () => {
    const preload = source('src/preload/index.ts')
    const controller = source('src/renderer/src/coder/hooks/useTranscriptionController.ts')

    expect(preload).toContain("ipcRenderer.on('interview-question-detected'")
    expect(preload).toContain("ipcRenderer.removeAllListeners('interview-question-detected')")
    expect(controller).toContain('window.api.onInterviewQuestionDetected((question) =>')
    expect(controller).toContain('setDetectedQuestion(question)')
  })

  it('shows the detected question and keeps answer prompts visible when auto assist is enabled', () => {
    const panel = source('src/renderer/src/coder/interview/InterviewCoachPanel.tsx')

    expect(panel).toContain("useSettingValue('realtimeAssistEnabled')")
    expect(panel).toContain("t('coach.detectedQuestion')")
    expect(panel).toContain("t('coach.detectedQuestionWaiting')")
    expect(panel).toContain('detectedQuestion.question')
    expect(panel).toContain('StructuredInterviewAssist')
    expect(panel).toContain('window.api.saveInterviewAnswerPolicy({')
    expect(panel).toContain('window.api.findInterviewAnswerPolicy(currentAssist.question)')
    expect(panel).toContain("t('coach.rememberAnswerPolicy')")
    expect(panel).toContain('collectSpokenInterviewAnswer({')
    expect(panel).toContain("t('coach.rememberSpokenAnswer')")
    expect(panel).toContain('saveSpokenAnswerPolicy')
  })

  it('provides a visible project-knowledge settings workflow', () => {
    const settings = source('src/renderer/src/settings/index.tsx')
    const section = source('src/renderer/src/settings/ProjectKnowledgeSettingsSection.tsx')
    const external = source('src/renderer/src/settings/ExternalKnowledgeSettings.tsx')
    const materials = source('src/renderer/src/settings/LocalKnowledgeDocuments.tsx')
    const preload = source('src/preload/index.ts')

    expect(settings).toContain('ProjectKnowledgeSettingsSection')
    expect(section).toContain('window.api.importProjectKnowledge()')
    expect(section).toContain('window.api.reindexProjectKnowledge(projectId)')
    expect(section).toContain('window.api.removeProjectKnowledge(projectId)')
    expect(section).toContain('window.api.saveInterviewAnswerPolicy({')
    expect(section).toContain('window.api.deleteInterviewAnswerPolicy(policyId)')
    expect(section).toContain('ExternalKnowledgeSettings')
    expect(external).toContain('window.api.saveExternalKnowledgeSource({')
    expect(external).toContain('window.api.testExternalKnowledgeSource(sourceId)')
    expect(external).toContain('window.api.setExternalKnowledgeSourceEnabled(sourceId, enabled)')
    expect(external).toContain('window.api.deleteExternalKnowledgeSource(sourceId)')
    expect(materials).toContain('window.api.importProjectKnowledgeDocument(role)')
    expect(materials).toContain('window.api.reindexProjectKnowledgeDocument(documentId)')
    expect(materials).toContain('window.api.removeProjectKnowledgeDocument(documentId)')
    expect(preload).toContain("'external-knowledge-source-save'")
    expect(preload).toContain("'external-knowledge-source-test'")
  })

  it('ships detected-question copy in every supported UI language', () => {
    for (const locale of ['zh', 'en', 'ja', 'ko', 'fr']) {
      const localeSource = source(`src/renderer/src/lib/i18n/locales/${locale}.ts`)
      expect(localeSource).toContain('detectedQuestion:')
      expect(localeSource).toContain('detectedQuestionWaiting:')
      expect(localeSource).toContain('opening:')
      expect(localeSource).toContain('followUp:')
      expect(localeSource).toContain('rememberAnswerPolicy:')
      expect(localeSource).toContain('rememberSpokenAnswer:')
      expect(localeSource).toContain('spokenAnswerTitle:')
      expect(localeSource).toContain('projectKnowledge:')
      expect(localeSource).toContain("'project-fact':")
      expect(localeSource).toContain("'user-voice':")
      expect(localeSource).toContain('materials:')
    }
  })

  it('asks the model for the streaming structured assist protocol', () => {
    const ai = source('src/main/ai.ts')

    expect(ai).toContain('[OPENING]')
    expect(ai).toContain('[PATH]')
    expect(ai).toContain('[EVIDENCE]')
    expect(ai).toContain('[FOLLOW_UP]')
    expect(ai).toContain('[AVOID]')
    expect(ai).toContain('buildInterviewKnowledgePrompt(question, abortSignal)')
  })
})
