/** Bridge streamed answer markdown into the typed-block AnswerDocument model,
   WITHOUT requiring the AI to emit structured blocks (which would be a core
   prompt change + on-device streaming re-verification).

   The AI already streams heading-delimited markdown. This module classifies
   each heading into a BlockType (by bilingual keyword heuristics) and turns
   fenced code into dedicated `code` blocks, so answer-document.ts's tested
   diffRevisions / rollbackTo / undo become usable on live answers: two
   follow-up revisions of the same answer can now be diffed block-by-block.

   Pure: no IO, no clock, no randomness. Deterministic ids are derived from the
   block's position + type so the same markdown always yields the same ids
   (callers that need globally-unique ids can prefix them). */

import type { AnswerBlock, BlockType } from './answer-document'
import { splitSections, extractCodeBlocks } from './answer-markdown'

// Lowercased heading keywords per block type. A heading is classified to the
// first type (in HEADING_ORDER) whose keyword it contains. Chinese + English so
// it works across the app's languages.
const HEADING_SIGNALS: Record<Exclude<BlockType, 'code'>, string[]> = {
  'question-summary': ['题目', '问题', 'question', 'summary', '概述', '理解'],
  clarifications: ['澄清', '假设', 'clarif', 'assumption', '前提'],
  'core-conclusion': ['结论', '核心', 'conclusion', 'answer', 'tl;dr', '直接回答'],
  plan: ['思路', '方案', '步骤', 'plan', 'approach', 'idea', 'solution', '解法'],
  complexity: ['复杂度', 'complexity', 'time', 'space', '时间', '空间'],
  tests: ['测试', '用例', 'test', 'example', '示例', 'edge case', '边界'],
  risks: ['风险', '注意', 'risk', 'pitfall', 'caveat', 'trade-off', '权衡'],
  'spoken-version': ['口述', '口播', 'spoken', '面试官', 'say', '这样说']
}

// Order in which heading keywords are checked (first match wins), so a heading
// like "复杂度分析" maps to complexity rather than an earlier partial match.
const HEADING_ORDER: Exclude<BlockType, 'code'>[] = [
  'question-summary',
  'clarifications',
  'core-conclusion',
  'complexity',
  'tests',
  'risks',
  'spoken-version',
  'plan'
]

/** Classify a section heading into a prose BlockType. Falls back to 'plan' —
   the most general "here is the substance" bucket — when nothing matches, so an
   unlabeled section is still diffable rather than dropped. */
export function classifyHeading(heading: string): Exclude<BlockType, 'code'> {
  const hay = heading.toLowerCase()
  for (const type of HEADING_ORDER) {
    if (HEADING_SIGNALS[type].some((kw) => hay.includes(kw))) return type
  }
  return 'plan'
}

/** Strip fenced code from a section body so a prose block doesn't duplicate the
   code that becomes its own `code` block. Keeps everything outside fences. */
function stripFences(markdown: string): string {
  return markdown.replace(
    /(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g,
    '$1'
  )
}

/** Convert streamed answer markdown into typed blocks in document order.

   Each heading-delimited section becomes one prose block (its heading
   classified) plus one `code` block per fenced code block inside it. The
   preamble (content before the first heading) is classified too. Empty prose
   (a section that is only code) yields no prose block. Block ids are
   `${index}-${type}` — stable for identical input. */
export function blocksFromMarkdown(markdown: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = []
  const sections = splitSections(markdown)
  let index = 0
  for (const section of sections) {
    const type = section.heading === '' ? 'core-conclusion' : classifyHeading(section.heading)
    const prose = stripFences(section.content).trim()
    if (prose !== '') {
      blocks.push({ id: `${index}-${type}`, type, content: prose })
      index += 1
    }
    for (const code of extractCodeBlocks(section.content)) {
      const block: AnswerBlock = { id: `${index}-code`, type: 'code', content: code.content }
      if (code.lang !== '') block.lang = code.lang
      blocks.push(block)
      index += 1
    }
  }
  return blocks
}
