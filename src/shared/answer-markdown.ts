/** Pure helpers to pull structure out of already-streamed answer markdown,
   without requiring the AI to emit typed blocks. This backs the "只复制代码"
   (copy-code-only) and block-count affordances in the chat UI — the runtime
   complement to answer-document.ts's copyCodeOnly, which operates on typed
   blocks we don't yet produce live.

   Pure: no IO, no clock, no randomness. */

export interface MarkdownCodeBlock {
  lang: string
  content: string
}

// A fenced code block: ``` optionally followed by a language, then content up
// to the closing fence. Tilde fences (~~~) are also accepted. The closing fence
// must use the same character as the opening one.
const FENCE_RE = /(^|\n)([ \t]*)(`{3,}|~{3,})([^\n`]*)\n([\s\S]*?)(?:\n[ \t]*\3[ \t]*(?=\n|$))/g

/** Extract fenced code blocks from markdown in document order. The info string
   after the fence (e.g. ```ts) becomes `lang` (trimmed, first token only).
   A trailing newline inside the block is preserved as authored except the final
   one before the closing fence. Unterminated fences are ignored. */
export function extractCodeBlocks(markdown: string): MarkdownCodeBlock[] {
  const blocks: MarkdownCodeBlock[] = []
  FENCE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FENCE_RE.exec(markdown)) !== null) {
    const lang = match[4].trim().split(/\s+/)[0] ?? ''
    blocks.push({ lang, content: match[5] })
  }
  return blocks
}

/** Concatenate every fenced code block's content, blank-line separated — the
   "只复制代码" payload. Returns '' when the markdown contains no code. */
export function copyCodeOnlyFromMarkdown(markdown: string): string {
  return extractCodeBlocks(markdown)
    .map((b) => b.content)
    .join('\n\n')
}

/** Whether the markdown contains at least one fenced code block, so the UI can
   show/hide the copy-code action. */
export function hasCodeBlock(markdown: string): boolean {
  FENCE_RE.lastIndex = 0
  return FENCE_RE.test(markdown)
}

export interface MarkdownSection {
  /** The heading text (without leading #), or '' for content before the first
     heading. */
  heading: string
  /** Heading level 1-6, or 0 for the pre-heading preamble. */
  level: number
  /** The section body (everything under the heading up to the next heading). */
  content: string
}

// An ATX heading line: 1-6 leading '#', a space, then the heading text. Matched
// at a line start only (avoids '#' inside code/inline).
const HEADING_LINE = /^(#{1,6})\s+(.+?)\s*$/

/** Split answer markdown into heading-delimited sections in document order, so
   the UI can offer block-level copy without the AI emitting typed blocks. Any
   content before the first heading becomes a level-0 section with heading ''.
   Fenced code is treated as opaque: '#' inside a code block never starts a new
   section. A document with no headings yields a single level-0 section holding
   the whole text (empty input → []). */
export function splitSections(markdown: string): MarkdownSection[] {
  if (!markdown.trim()) return []
  const lines = markdown.split('\n')
  const sections: MarkdownSection[] = []
  let current: MarkdownSection = { heading: '', level: 0, content: '' }
  let currentLines: string[] = []
  let inFence = false
  let fenceMarker = ''

  const flush = (): void => {
    current.content = currentLines.join('\n').trim()
    if (current.heading !== '' || current.content !== '') sections.push(current)
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^[ \t]*(`{3,}|~{3,})/)
    if (fenceMatch) {
      if (!inFence) {
        inFence = true
        fenceMarker = fenceMatch[1][0]
      } else if (fenceMatch[1][0] === fenceMarker) {
        inFence = false
      }
      currentLines.push(line)
      continue
    }
    const heading = inFence ? null : line.match(HEADING_LINE)
    if (heading) {
      flush()
      current = { heading: heading[2], level: heading[1].length, content: '' }
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  flush()
  return sections
}
