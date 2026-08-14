import { describe, expect, it } from 'vitest'
import { analyzeProjectFile } from '../src/main/services/project-index/tree-sitter-project-analyzer'

describe('Tree-sitter project analyzer', () => {
  it('extracts TypeScript declarations, calls, and semantic chunks without comment false positives', async () => {
    const analysis = await analyzeProjectFile({
      projectId: 'p1',
      relativePath: 'src/main/interview-coach.ts',
      content: `
import { buildInterviewKnowledgePrompt } from './knowledge'
// function fakeSymbol() {}
export class InterviewCoach {
  async runAssist(question: string) {
    return buildInterviewKnowledgePrompt(question)
  }

  buildPrompt = (query: string) => query.trim()
}

export function startRealtimeAsr() {
  return new InterviewCoach().runAssist('hello')
}
`.trim()
    })

    expect(analysis.engine).toBe('tree-sitter')
    expect(analysis.sourceFile.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining(['InterviewCoach', 'runAssist', 'buildPrompt', 'startRealtimeAsr'])
    )
    expect(analysis.sourceFile.symbols.map((symbol) => symbol.name)).not.toContain('fakeSymbol')
    expect(analysis.sourceFile.calls).toEqual(
      expect.arrayContaining(['buildInterviewKnowledgePrompt', 'trim', 'runAssist'])
    )
    expect(analysis.chunks.map((chunk) => chunk.symbol)).toEqual(
      expect.arrayContaining(['InterviewCoach', 'runAssist', 'buildPrompt', 'startRealtimeAsr'])
    )
    expect(analysis.chunks.find((chunk) => chunk.symbol === 'runAssist')?.text).toContain(
      'buildInterviewKnowledgePrompt(question)'
    )
  })

  it('extracts Python functions and preserves a regex fallback for unsupported languages', async () => {
    const python = await analyzeProjectFile({
      projectId: 'p1',
      relativePath: 'service/interview.py',
      content:
        'class InterviewService:\n    def answer_question(self, question):\n        return retrieve_context(question)\n'
    })
    const swift = await analyzeProjectFile({
      projectId: 'p1',
      relativePath: 'Sources/App.swift',
      content: 'func startInterview() {\n  print("ready")\n}'
    })

    expect(python.engine).toBe('tree-sitter')
    expect(python.sourceFile.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining(['InterviewService', 'answer_question'])
    )
    expect(python.sourceFile.calls).toContain('retrieve_context')
    expect(swift.engine).toBe('regex')
    expect(swift.sourceFile.symbols.map((symbol) => symbol.name)).toContain('startInterview')
  })
})
