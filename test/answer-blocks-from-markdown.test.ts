import { describe, expect, it } from 'vitest'
import { blocksFromMarkdown, classifyHeading } from '../src/shared/answer-blocks-from-markdown'
import { commitRevision, createDocument, diffRevisions } from '../src/shared/answer-document'

describe('classifyHeading', () => {
  it('maps Chinese headings to block types', () => {
    expect(classifyHeading('题目理解')).toBe('question-summary')
    expect(classifyHeading('澄清假设')).toBe('clarifications')
    expect(classifyHeading('核心结论')).toBe('core-conclusion')
    expect(classifyHeading('复杂度分析')).toBe('complexity')
    expect(classifyHeading('测试用例')).toBe('tests')
    expect(classifyHeading('风险与权衡')).toBe('risks')
    expect(classifyHeading('口述版本')).toBe('spoken-version')
  })

  it('maps English headings to block types', () => {
    expect(classifyHeading('Question Summary')).toBe('question-summary')
    expect(classifyHeading('Approach')).toBe('plan')
    expect(classifyHeading('Time Complexity')).toBe('complexity')
    expect(classifyHeading('Edge Cases')).toBe('tests')
  })

  it('falls back to plan when nothing matches', () => {
    expect(classifyHeading('Something Else Entirely')).toBe('plan')
  })
})

describe('blocksFromMarkdown', () => {
  it('splits a headed answer into typed prose + code blocks', () => {
    const md = [
      '## 思路',
      '先排序再双指针。',
      '```ts',
      'arr.sort()',
      '```',
      '## 复杂度',
      'O(n log n)。'
    ].join('\n')
    const blocks = blocksFromMarkdown(md)
    expect(blocks.map((b) => b.type)).toEqual(['plan', 'code', 'complexity'])
    expect(blocks[1]).toMatchObject({ type: 'code', lang: 'ts', content: 'arr.sort()' })
    // prose block must not still contain the fenced code
    expect(blocks[0].content).not.toContain('arr.sort()')
    expect(blocks[0].content).toBe('先排序再双指针。')
  })

  it('classifies a headingless preamble as core-conclusion', () => {
    const blocks = blocksFromMarkdown('直接返回哈希表命中即可。')
    expect(blocks).toEqual([
      { id: '0-core-conclusion', type: 'core-conclusion', content: '直接返回哈希表命中即可。' }
    ])
  })

  it('yields no prose block for a code-only section', () => {
    const md = '## 代码\n```py\nprint(1)\n```'
    const blocks = blocksFromMarkdown(md)
    expect(blocks.map((b) => b.type)).toEqual(['code'])
    expect(blocks[0]).toMatchObject({ lang: 'py', content: 'print(1)' })
  })

  it('produces stable ids for identical input', () => {
    const md = '## 思路\nA\n## 复杂度\nB'
    expect(blocksFromMarkdown(md)).toEqual(blocksFromMarkdown(md))
    expect(blocksFromMarkdown(md).map((b) => b.id)).toEqual(['0-plan', '1-complexity'])
  })

  it('omits lang when the fence has no info string', () => {
    const blocks = blocksFromMarkdown('```\nraw\n```')
    expect(blocks).toEqual([{ id: '0-code', type: 'code', content: 'raw' }])
  })

  it('returns [] for empty input', () => {
    expect(blocksFromMarkdown('')).toEqual([])
    expect(blocksFromMarkdown('   \n  ')).toEqual([])
  })

  it('feeds diffRevisions so two answer revisions diff block-by-block', () => {
    const v1 = blocksFromMarkdown('## 思路\n双指针\n## 复杂度\nO(n)')
    const v2 = blocksFromMarkdown('## 思路\n改用哈希表\n## 复杂度\nO(n)')
    const doc = commitRevision(commitRevision(createDocument(), v1, 1), v2, 2)
    const diff = diffRevisions(doc.revisions[0], doc.revisions[1])
    const changed = diff.filter((d) => d.changed).map((d) => d.type)
    expect(changed).toEqual(['plan'])
  })
})
