import { describe, expect, it } from 'vitest'
import { extractFirstCodeBlock, selectAnswerCopyText } from '../src/shared/answer-copy'

describe('extractFirstCodeBlock', () => {
  it('extracts the first fenced block, dropping the language tag', () => {
    const md = 'Here you go:\n\n```python\nprint("hi")\n```\n\nDone.'
    expect(extractFirstCodeBlock(md)).toBe('print("hi")')
  })

  it('returns only the first block when several exist', () => {
    const md = '```js\na()\n```\ntext\n```js\nb()\n```'
    expect(extractFirstCodeBlock(md)).toBe('a()')
  })

  it('handles a fence with no language tag', () => {
    expect(extractFirstCodeBlock('```\nplain\n```')).toBe('plain')
  })

  it('preserves internal blank lines but trims trailing newlines', () => {
    expect(extractFirstCodeBlock('```\nline1\n\nline2\n\n```')).toBe('line1\n\nline2')
  })

  it('returns null when there is no fenced block', () => {
    expect(extractFirstCodeBlock('just prose, no code')).toBeNull()
  })

  it('returns null for an empty code block', () => {
    expect(extractFirstCodeBlock('```\n\n```')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(extractFirstCodeBlock('')).toBeNull()
  })
})

describe('selectAnswerCopyText', () => {
  it('prefers the first code block when present', () => {
    expect(selectAnswerCopyText('intro\n```ts\nconst x = 1\n```')).toBe('const x = 1')
  })

  it('falls back to the whole trimmed answer when there is no code block', () => {
    expect(selectAnswerCopyText('  just an explanation  ')).toBe('just an explanation')
  })

  it('returns null for empty / missing answers', () => {
    expect(selectAnswerCopyText('')).toBeNull()
    expect(selectAnswerCopyText('   ')).toBeNull()
    expect(selectAnswerCopyText(null)).toBeNull()
    expect(selectAnswerCopyText(undefined)).toBeNull()
  })
})
