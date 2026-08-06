import { describe, expect, it } from 'vitest'
import {
  copyCodeOnlyFromMarkdown,
  extractCodeBlocks,
  hasCodeBlock,
  splitSections
} from '../src/shared/answer-markdown'

describe('extractCodeBlocks', () => {
  it('extracts a single fenced block with its language', () => {
    const md = 'Here:\n```ts\nconst x = 1\n```\nDone.'
    expect(extractCodeBlocks(md)).toEqual([{ lang: 'ts', content: 'const x = 1' }])
  })

  it('extracts multiple blocks in document order', () => {
    const md = '```js\na()\n```\ntext\n```py\nb()\n```'
    expect(extractCodeBlocks(md)).toEqual([
      { lang: 'js', content: 'a()' },
      { lang: 'py', content: 'b()' }
    ])
  })

  it('treats a fence with no language as empty lang', () => {
    const md = '```\nplain\n```'
    expect(extractCodeBlocks(md)).toEqual([{ lang: '', content: 'plain' }])
  })

  it('keeps only the first token of the info string as lang', () => {
    const md = '```ts title=foo.ts\ncode\n```'
    expect(extractCodeBlocks(md)[0].lang).toBe('ts')
  })

  it('preserves internal blank lines and indentation', () => {
    const md = '```py\ndef f():\n\n    return 1\n```'
    expect(extractCodeBlocks(md)[0].content).toBe('def f():\n\n    return 1')
  })

  it('accepts tilde fences', () => {
    const md = '~~~go\nfmt.Println()\n~~~'
    expect(extractCodeBlocks(md)).toEqual([{ lang: 'go', content: 'fmt.Println()' }])
  })

  it('ignores an unterminated fence', () => {
    const md = '```ts\nconst x = 1\nno closing fence'
    expect(extractCodeBlocks(md)).toEqual([])
  })

  it('returns [] when there is no code', () => {
    expect(extractCodeBlocks('just prose, no fences')).toEqual([])
  })

  it('handles a block at the very start and very end', () => {
    expect(extractCodeBlocks('```\nonly\n```')).toEqual([{ lang: '', content: 'only' }])
  })

  it('is stable across repeated calls (regex lastIndex reset)', () => {
    const md = '```ts\na\n```\n```ts\nb\n```'
    expect(extractCodeBlocks(md)).toEqual(extractCodeBlocks(md))
  })
})

describe('copyCodeOnlyFromMarkdown', () => {
  it('joins all code blocks blank-line separated', () => {
    const md = '```ts\na\n```\nprose\n```ts\nb\n```'
    expect(copyCodeOnlyFromMarkdown(md)).toBe('a\n\nb')
  })

  it('returns empty string when there is no code', () => {
    expect(copyCodeOnlyFromMarkdown('no code here')).toBe('')
  })
})

describe('hasCodeBlock', () => {
  it('is true when a fenced block exists', () => {
    expect(hasCodeBlock('```\nx\n```')).toBe(true)
  })

  it('is false for prose only', () => {
    expect(hasCodeBlock('nothing fenced here')).toBe(false)
  })

  it('is stable across repeated calls', () => {
    const md = '```ts\nx\n```'
    expect(hasCodeBlock(md)).toBe(true)
    expect(hasCodeBlock(md)).toBe(true)
  })
})

describe('splitSections', () => {
  it('returns [] for empty input', () => {
    expect(splitSections('')).toEqual([])
    expect(splitSections('   \n  ')).toEqual([])
  })

  it('returns a single level-0 section when there are no headings', () => {
    expect(splitSections('just prose\nmore prose')).toEqual([
      { heading: '', level: 0, content: 'just prose\nmore prose' }
    ])
  })

  it('splits on ATX headings and records level + heading text', () => {
    const md = '# Plan\ndo x\n## Complexity\nO(n)'
    expect(splitSections(md)).toEqual([
      { heading: 'Plan', level: 1, content: 'do x' },
      { heading: 'Complexity', level: 2, content: 'O(n)' }
    ])
  })

  it('captures preamble before the first heading as a level-0 section', () => {
    const md = 'intro line\n# Plan\ndo x'
    expect(splitSections(md)).toEqual([
      { heading: '', level: 0, content: 'intro line' },
      { heading: 'Plan', level: 1, content: 'do x' }
    ])
  })

  it('does not treat # inside a code fence as a heading', () => {
    const md = '# Code\n```py\n# a comment\nx = 1\n```\ntail'
    const sections = splitSections(md)
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('Code')
    expect(sections[0].content).toContain('# a comment')
  })

  it('keeps an empty-body heading section', () => {
    const md = '# Only Heading'
    expect(splitSections(md)).toEqual([{ heading: 'Only Heading', level: 1, content: '' }])
  })

  it('is deterministic across repeated calls', () => {
    const md = '# A\nx\n## B\ny'
    expect(splitSections(md)).toEqual(splitSections(md))
  })
})
