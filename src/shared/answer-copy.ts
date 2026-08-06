/** Extract the first fenced code block from a markdown string.
 *
 * Interview flow: the user presses a global shortcut to grab the code the AI
 * just produced and paste it into their editor — hands-free, without hovering
 * the per-block copy button (impossible in mouse-passthrough mode). We return
 * just the code so nothing but runnable text lands on the clipboard.
 *
 * Returns the trimmed code inside the first ```-fenced block, or null if the
 * text has no fenced block (caller falls back to copying the whole answer). */
export function extractFirstCodeBlock(markdown: string): string | null {
  if (!markdown) return null
  // Opening fence: ``` optionally followed by a language tag, to end of line.
  // Capture everything up to the next closing fence on its own line.
  const match = markdown.match(/```[^\n]*\n([\s\S]*?)```/)
  if (!match) return null
  const code = match[1].replace(/\n+$/, '')
  return code.trim() ? code : null
}

/** Pick what to copy for the "copy latest answer" shortcut: the first code
 * block if the answer has one, otherwise the whole answer text. Returns null
 * when there's nothing meaningful to copy. */
export function selectAnswerCopyText(answer: string | undefined | null): string | null {
  const text = answer?.trim()
  if (!text) return null
  return extractFirstCodeBlock(text) ?? text
}
