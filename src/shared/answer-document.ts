/** Structured "AnswerDocument" model ("结构化答案文档").

   Instead of a single markdown blob, an AI answer is composed of typed blocks
   (question summary, plan, code, complexity, tests, ...). This structure buys
   us: block-level copy, copy-code-only ("只复制代码"), a per-block diff between
   revisions, and undo/rollback.

   The whole module is pure: no Date.now() / Math.random(). Callers pass any
   timestamp (`now`) and any ids they need. Revisions are append-only and prior
   revisions are never mutated — that immutability is exactly what makes undo
   and rollback lossless. */

export type BlockType =
  | 'question-summary'
  | 'clarifications'
  | 'core-conclusion'
  | 'plan'
  | 'code'
  | 'complexity'
  | 'tests'
  | 'risks'
  | 'spoken-version'

/** A single typed piece of an answer. `lang` is only meaningful for code. */
export interface AnswerBlock {
  id: string
  type: BlockType
  content: string
  lang?: string
}

/** One immutable snapshot of an answer. `revision` is monotonic (1-based). */
export interface AnswerRevision {
  revision: number
  blocks: AnswerBlock[]
  createdAt: number
}

/** Ordered revisions; the last entry is the current answer. */
export interface AnswerDocument {
  revisions: AnswerRevision[]
}

/** Every block type, in canonical order. Used to give diffRevisions a stable
   set of rows to report regardless of which types either revision contains. */
const BLOCK_TYPES: BlockType[] = [
  'question-summary',
  'clarifications',
  'core-conclusion',
  'plan',
  'code',
  'complexity',
  'tests',
  'risks',
  'spoken-version'
]

/** Deep-copy a block so appended revisions never share references with prior
   ones (protects immutability of the history). */
function cloneBlock(block: AnswerBlock): AnswerBlock {
  const copy: AnswerBlock = { id: block.id, type: block.type, content: block.content }
  if (block.lang !== undefined) copy.lang = block.lang
  return copy
}

/** An empty document with no revisions. */
export function createDocument(): AnswerDocument {
  return { revisions: [] }
}

/** Append a new revision holding `blocks`, numbered prevMax + 1 (starts at 1).

   Prior revisions are left untouched and the incoming `blocks` array is copied,
   so neither the document nor the caller's array is mutated. This append-only
   design is what lets undo/rollback recover earlier answers. */
export function commitRevision(
  doc: AnswerDocument,
  blocks: AnswerBlock[],
  now: number
): AnswerDocument {
  const prevMax = doc.revisions.reduce((max, r) => Math.max(max, r.revision), 0)
  const revision: AnswerRevision = {
    revision: prevMax + 1,
    blocks: blocks.map(cloneBlock),
    createdAt: now
  }
  return { revisions: [...doc.revisions, revision] }
}

/** The current (last) revision, or null when the document is empty. */
export function currentRevision(doc: AnswerDocument): AnswerRevision | null {
  return doc.revisions.length > 0 ? doc.revisions[doc.revisions.length - 1] : null
}

/** First block of the given type in a revision, or null when none exists. */
export function blockByType(revision: AnswerRevision, type: BlockType): AnswerBlock | null {
  return revision.blocks.find((b) => b.type === type) ?? null
}

/** The content of one block by id, or '' when the id is not present. */
export function copyBlock(revision: AnswerRevision, blockId: string): string {
  const block = revision.blocks.find((b) => b.id === blockId)
  return block ? block.content : ''
}

/** All 'code' blocks' content, in order, joined by a blank line (for the
   "只复制代码" action). Prose blocks are ignored. Returns '' when there is no
   code. */
export function copyCodeOnly(revision: AnswerRevision): string {
  return revision.blocks
    .filter((b) => b.type === 'code')
    .map((b) => b.content)
    .join('\n\n')
}

/** Join the content of every block of a type, so a type with multiple blocks
   compares as a single unit in diffRevisions. Missing type -> null. */
function joinedByType(revision: AnswerRevision, type: BlockType): string | null {
  const parts = revision.blocks.filter((b) => b.type === type).map((b) => b.content)
  return parts.length > 0 ? parts.join('\n\n') : null
}

/** Per-block-type diff between two revisions.

   Blocks are matched BY TYPE. When a revision has multiple blocks of the same
   type, their contents are joined (blank-line separated) and compared as one
   unit. A type counts as `changed: true` when it was added (missing in `a`),
   removed (missing in `b`), or modified (present in both with different joined
   content). Only types present in at least one revision are reported. */
export function diffRevisions(
  a: AnswerRevision,
  b: AnswerRevision
): { type: BlockType; changed: boolean }[] {
  const result: { type: BlockType; changed: boolean }[] = []
  for (const type of BLOCK_TYPES) {
    const left = joinedByType(a, type)
    const right = joinedByType(b, type)
    if (left === null && right === null) continue
    result.push({ type, changed: left !== right })
  }
  return result
}

/** Make a historical revision current by appending a COPY of it as a new
   revision (numbered prevMax + 1). Rollback moves forward through history
   rather than deleting anything, so no revision is ever lost — you can even
   undo the rollback. Returns the document unchanged when the target revision
   number does not exist. */
export function rollbackTo(doc: AnswerDocument, revision: number): AnswerDocument {
  const target = doc.revisions.find((r) => r.revision === revision)
  if (!target) return doc
  const prevMax = doc.revisions.reduce((max, r) => Math.max(max, r.revision), 0)
  const restored: AnswerRevision = {
    revision: prevMax + 1,
    blocks: target.blocks.map(cloneBlock),
    createdAt: target.createdAt
  }
  return { revisions: [...doc.revisions, restored] }
}

/** Drop the last revision. No-op when one revision or fewer remains — a
   committed document keeps at least its first revision. */
export function undo(doc: AnswerDocument): AnswerDocument {
  if (doc.revisions.length <= 1) return doc
  return { revisions: doc.revisions.slice(0, -1) }
}
