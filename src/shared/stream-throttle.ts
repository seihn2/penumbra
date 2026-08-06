/** Pure decision helpers for long-session performance governance
   （长会话性能治理 + 增量 IPC 与音频 QoS）.

   Under heavy AI token output and dual audio capture the app must:
   - coalesce streamed tokens per frame (~32–50ms) instead of one IPC per token
   - throttle persistence (persist every ~2s or at turn end, never per-token)
   - cap audio-diagnostic UI updates (<=4/s)
   - virtualize the message list (cap DOM rows ~60)
   - skip expensive re-highlighting while a code block is still streaming

   This module holds ONLY the pure decisions — no timers, no DOM, no I/O. All
   clocks/timestamps are passed in, so every helper is deterministic and
   unit-testable. Do NOT call Date.now/Math.random here. */

/** True when at least `frameMs` has elapsed since the last flush, i.e. it's
   time to flush the coalesced token buffer for this frame (token coalescing). */
export function shouldFlushFrame(lastFlushAt: number, now: number, frameMs = 40): boolean {
  return now - lastFlushAt >= frameMs
}

/** Accumulate streamed text between frame flushes. Trivial concat kept as a
   named helper so call sites read intentfully (coalesce vs. replace). */
export function coalesce(buffer: string, incoming: string): string {
  return buffer + incoming
}

/** True when we should persist now: always at turn end, otherwise only once
   `intervalMs` has elapsed since the last persist. Never persist per-token. */
export function shouldPersist(
  lastPersistAt: number,
  now: number,
  turnEnded: boolean,
  intervalMs = 2000
): boolean {
  return turnEnded || now - lastPersistAt >= intervalMs
}

/** True when an audio-diagnostic UI update is allowed: cap at `maxPerSec`
   updates per second (default 4/s => one update at most every 250ms). */
export function shouldUpdateDiagnostics(lastAt: number, now: number, maxPerSec = 4): boolean {
  return now - lastAt >= 1000 / maxPerSec
}

/** True when every fenced code block in the markdown is closed — an even count
   of ``` fences. While a fence is still open (odd count) the block is mid-stream
   and re-highlighting it is wasted work. */
export function isCodeBlockClosed(markdown: string): boolean {
  const matches = markdown.match(/```/g)
  const fenceCount = matches ? matches.length : 0
  return fenceCount % 2 === 0
}

/** True only when it's worth running the (expensive) syntax highlight pass:
   skip while a code block is still streaming (an unclosed fence). */
export function shouldHighlight(markdown: string): boolean {
  return isCodeBlockClosed(markdown)
}

/** Return the last `maxRows` items, preserving order (message-list
   virtualization: cap the number of rows mounted in the DOM). Returns all items
   when there are fewer than the cap. */
export function visibleWindow<T>(items: T[], maxRows = 60): T[] {
  if (items.length <= maxRows) return items
  return items.slice(items.length - maxRows)
}

/** Graceful degradation ladder. When performance is insufficient we shed
   non-essential work in this fixed order: first drop animations, then syntax
   highlighting, then screenshot thumbnails.

   IMPORTANT: audio capture and answer text are NEVER on this ladder — they are
   the core of the product and must keep running at every level. */
export type DegradeLevel = 'full' | 'no-animations' | 'no-highlight' | 'no-thumbnails'

/** The ordered degradation ladder, best quality first. */
export const DEGRADE_LADDER: readonly DegradeLevel[] = [
  'full',
  'no-animations',
  'no-highlight',
  'no-thumbnails'
]

/** Step to the next (more degraded) level. Returns `null` once already at the
   most degraded level — there is nothing further to shed (audio/answer text are
   intentionally not in the ladder, so we never degrade past thumbnails). */
export function nextDegradation(level: DegradeLevel): DegradeLevel | null {
  const index = DEGRADE_LADDER.indexOf(level)
  if (index === -1 || index >= DEGRADE_LADDER.length - 1) return null
  return DEGRADE_LADDER[index + 1]
}
