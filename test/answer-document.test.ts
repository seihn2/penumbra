import { describe, expect, it } from 'vitest'
import {
  blockByType,
  commitRevision,
  copyBlock,
  copyCodeOnly,
  createDocument,
  currentRevision,
  diffRevisions,
  rollbackTo,
  undo,
  type AnswerBlock
} from '../src/shared/answer-document'

function block(id: string, type: AnswerBlock['type'], content: string, lang?: string): AnswerBlock {
  return lang === undefined ? { id, type, content } : { id, type, content, lang }
}

describe('createDocument', () => {
  it('starts with no revisions', () => {
    expect(createDocument().revisions).toEqual([])
  })
})

describe('commitRevision', () => {
  it('numbers the first revision 1 and stores its blocks', () => {
    const doc = commitRevision(createDocument(), [block('a', 'plan', 'do X')], 100)
    expect(doc.revisions).toHaveLength(1)
    expect(doc.revisions[0].revision).toBe(1)
    expect(doc.revisions[0].createdAt).toBe(100)
    expect(doc.revisions[0].blocks).toEqual([{ id: 'a', type: 'plan', content: 'do X' }])
  })

  it('bumps the revision number monotonically across commits', () => {
    let doc = commitRevision(createDocument(), [], 1)
    doc = commitRevision(doc, [], 2)
    doc = commitRevision(doc, [], 3)
    expect(doc.revisions.map((r) => r.revision)).toEqual([1, 2, 3])
  })

  it('preserves prior revisions unchanged (append-only history)', () => {
    const first = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    const firstRev = first.revisions[0]
    const second = commitRevision(first, [block('a', 'plan', 'v2')], 2)
    // the earlier revision object is carried over untouched
    expect(second.revisions[0]).toBe(firstRev)
    expect(second.revisions[0].blocks[0].content).toBe('v1')
  })

  it('does not mutate the input document', () => {
    const doc = createDocument()
    commitRevision(doc, [block('a', 'code', 'x')], 1)
    expect(doc.revisions).toEqual([])
  })

  it('copies the incoming blocks so caller mutation cannot leak in', () => {
    const blocks = [block('a', 'plan', 'orig')]
    const doc = commitRevision(createDocument(), blocks, 1)
    blocks[0].content = 'mutated'
    expect(doc.revisions[0].blocks[0].content).toBe('orig')
  })
})

describe('currentRevision', () => {
  it('returns null for an empty document', () => {
    expect(currentRevision(createDocument())).toBeNull()
  })

  it('returns the last committed revision', () => {
    let doc = commitRevision(createDocument(), [], 1)
    doc = commitRevision(doc, [block('a', 'plan', 'latest')], 2)
    expect(currentRevision(doc)?.revision).toBe(2)
    expect(currentRevision(doc)?.blocks[0].content).toBe('latest')
  })
})

describe('blockByType', () => {
  it('returns the first block of a type', () => {
    const doc = commitRevision(
      createDocument(),
      [block('a', 'code', 'first'), block('b', 'code', 'second')],
      1
    )
    expect(blockByType(doc.revisions[0], 'code')?.id).toBe('a')
  })

  it('returns null when no block of that type exists', () => {
    const doc = commitRevision(createDocument(), [block('a', 'plan', 'p')], 1)
    expect(blockByType(doc.revisions[0], 'tests')).toBeNull()
  })
})

describe('copyBlock', () => {
  it('returns the content of a block by id', () => {
    const doc = commitRevision(createDocument(), [block('x', 'risks', 'watch out')], 1)
    expect(copyBlock(doc.revisions[0], 'x')).toBe('watch out')
  })

  it("returns '' for a missing id", () => {
    const doc = commitRevision(createDocument(), [block('x', 'risks', 'watch out')], 1)
    expect(copyBlock(doc.revisions[0], 'nope')).toBe('')
  })
})

describe('copyCodeOnly', () => {
  it('joins only code blocks, ignoring prose blocks', () => {
    const doc = commitRevision(
      createDocument(),
      [
        block('s', 'question-summary', 'summary prose'),
        block('c1', 'code', 'line one', 'ts'),
        block('p', 'plan', 'plan prose'),
        block('c2', 'code', 'line two', 'ts')
      ],
      1
    )
    expect(copyCodeOnly(doc.revisions[0])).toBe('line one\n\nline two')
  })

  it("returns '' when there is no code block", () => {
    const doc = commitRevision(createDocument(), [block('p', 'plan', 'no code here')], 1)
    expect(copyCodeOnly(doc.revisions[0])).toBe('')
  })
})

describe('diffRevisions', () => {
  it('flags modified types as changed and leaves unchanged types false', () => {
    const a = commitRevision(
      createDocument(),
      [block('1', 'plan', 'same plan'), block('2', 'code', 'old code')],
      1
    )
    const b = commitRevision(
      createDocument(),
      [block('1', 'plan', 'same plan'), block('2', 'code', 'new code')],
      2
    )
    const diff = diffRevisions(a.revisions[0], b.revisions[0])
    expect(diff.find((d) => d.type === 'plan')?.changed).toBe(false)
    expect(diff.find((d) => d.type === 'code')?.changed).toBe(true)
  })

  it('detects an added block type', () => {
    const a = commitRevision(createDocument(), [block('1', 'plan', 'p')], 1)
    const b = commitRevision(
      createDocument(),
      [block('1', 'plan', 'p'), block('2', 'tests', 'added tests')],
      2
    )
    const diff = diffRevisions(a.revisions[0], b.revisions[0])
    expect(diff.find((d) => d.type === 'tests')?.changed).toBe(true)
    expect(diff.find((d) => d.type === 'plan')?.changed).toBe(false)
  })

  it('detects a removed block type', () => {
    const a = commitRevision(
      createDocument(),
      [block('1', 'plan', 'p'), block('2', 'risks', 'gone soon')],
      1
    )
    const b = commitRevision(createDocument(), [block('1', 'plan', 'p')], 2)
    const diff = diffRevisions(a.revisions[0], b.revisions[0])
    expect(diff.find((d) => d.type === 'risks')?.changed).toBe(true)
  })

  it('only reports types present in at least one revision', () => {
    const a = commitRevision(createDocument(), [block('1', 'plan', 'p')], 1)
    const b = commitRevision(createDocument(), [block('1', 'plan', 'p')], 2)
    const diff = diffRevisions(a.revisions[0], b.revisions[0])
    expect(diff.map((d) => d.type)).toEqual(['plan'])
  })

  it('compares multiple blocks of one type by joined content', () => {
    const a = commitRevision(
      createDocument(),
      [block('c1', 'code', 'aaa'), block('c2', 'code', 'bbb')],
      1
    )
    const same = commitRevision(
      createDocument(),
      [block('c1', 'code', 'aaa'), block('c2', 'code', 'bbb')],
      2
    )
    const different = commitRevision(
      createDocument(),
      [block('c1', 'code', 'aaa'), block('c2', 'code', 'ccc')],
      3
    )
    expect(diffRevisions(a.revisions[0], same.revisions[0])[0].changed).toBe(false)
    expect(diffRevisions(a.revisions[0], different.revisions[0])[0].changed).toBe(true)
  })
})

describe('rollbackTo', () => {
  it('appends a copy of the target revision as the new current, preserving history', () => {
    let doc = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    doc = commitRevision(doc, [block('a', 'plan', 'v2')], 2)
    const rolled = rollbackTo(doc, 1)
    expect(rolled.revisions).toHaveLength(3)
    // history for revisions 1 and 2 is intact
    expect(rolled.revisions.map((r) => r.revision)).toEqual([1, 2, 3])
    expect(rolled.revisions[1].blocks[0].content).toBe('v2')
    // new current revision holds a copy of revision 1's content
    expect(currentRevision(rolled)?.revision).toBe(3)
    expect(currentRevision(rolled)?.blocks[0].content).toBe('v1')
  })

  it('appends a deep copy, not a shared reference to the target blocks', () => {
    let doc = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    doc = commitRevision(doc, [block('a', 'plan', 'v2')], 2)
    const rolled = rollbackTo(doc, 1)
    expect(currentRevision(rolled)?.blocks[0]).not.toBe(doc.revisions[0].blocks[0])
  })

  it('is a no-op when the target revision does not exist', () => {
    const doc = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    expect(rollbackTo(doc, 99)).toBe(doc)
  })

  it('does not mutate the input document', () => {
    let doc = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    doc = commitRevision(doc, [block('a', 'plan', 'v2')], 2)
    rollbackTo(doc, 1)
    expect(doc.revisions).toHaveLength(2)
  })
})

describe('undo', () => {
  it('drops the last revision', () => {
    let doc = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    doc = commitRevision(doc, [block('a', 'plan', 'v2')], 2)
    const undone = undo(doc)
    expect(undone.revisions).toHaveLength(1)
    expect(currentRevision(undone)?.blocks[0].content).toBe('v1')
  })

  it('never empties below one revision', () => {
    const doc = commitRevision(createDocument(), [block('a', 'plan', 'v1')], 1)
    expect(undo(doc)).toBe(doc)
    expect(undo(doc).revisions).toHaveLength(1)
  })

  it('is a no-op on an empty document', () => {
    const doc = createDocument()
    expect(undo(doc)).toBe(doc)
  })

  it('does not mutate the input document', () => {
    let doc = commitRevision(createDocument(), [], 1)
    doc = commitRevision(doc, [], 2)
    undo(doc)
    expect(doc.revisions).toHaveLength(2)
  })
})
