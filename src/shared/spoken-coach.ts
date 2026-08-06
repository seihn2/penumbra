/** Pure logic for the "spoken-answer coach" (口语回答教练 + 速读 Coach UI).

   The coach hands the candidate speakable answers at several lengths, keeps the
   on-overlay live cue tight, freezes the cue once they start talking so it does
   not shift under them, and tracks where they are in their answer.

   Everything here is deterministic: no wall-clock or randomness. Timing and
   speaking flags are passed in by the caller. */

export type SpokenLength = '30s' | '60s' | 'deep'

export interface SpokenAnswer {
  opener: string
  points: string[]
  byLength: Record<SpokenLength, string>
}

/** The tight cue rendered on the overlay while the candidate speaks. */
export interface LiveCue {
  opener: string
  points: string[]
}

const OPENER_MAX_CHARS = 30
const POINT_MAX_CHARS = 24
const MAX_LIVE_POINTS = 3
const ELLIPSIS = '…'

/** Count characters by Unicode code point so CJK glyphs count as one each
   (String#length would over-count astral code points). */
function codePointLength(text: string): number {
  return Array.from(text).length
}

/** Truncate to `max` code points, replacing the tail with a single-char ellipsis
   when the text is longer. The returned string is at most `max` code points, so
   the ellipsis takes the place of the last kept code point. */
function truncateToCodePoints(text: string, max: number): string {
  const codePoints = Array.from(text)
  if (codePoints.length <= max) return text
  if (max <= 0) return ''
  return codePoints.slice(0, max - 1).join('') + ELLIPSIS
}

/** Build the tight live cue from a full spoken answer.

   Truncation rule:
   - opener is truncated to at most OPENER_MAX_CHARS (30) code points; when it is
     longer the last kept code point is replaced by an ellipsis.
   - at most MAX_LIVE_POINTS (3) points are kept; any beyond the third are dropped.
   - each kept point is truncated to at most POINT_MAX_CHARS (24) code points with
     the same ellipsis rule.
   All measurements are by code point, so Chinese/CJK text counts one per glyph. */
export function buildLiveCue(answer: SpokenAnswer): LiveCue {
  return {
    opener: truncateToCodePoints(answer.opener, OPENER_MAX_CHARS),
    points: answer.points
      .slice(0, MAX_LIVE_POINTS)
      .map((point) => truncateToCodePoints(point, POINT_MAX_CHARS))
  }
}

/** Rough speaking time in seconds: ceil(charCount / cps), where cps is characters
   spoken per second (~4 for Chinese). Deterministic; counts by code point. */
export function estimateSpeakingSeconds(text: string, cps = 4): number {
  const chars = codePointLength(text)
  if (chars === 0) return 0
  return Math.ceil(chars / cps)
}

/** Seconds left on the clock, floored at 0. */
export function remainingSeconds(totalSeconds: number, elapsedSeconds: number): number {
  return Math.max(0, totalSeconds - elapsedSeconds)
}

/** Extract the core keyword used to detect whether a point has been covered.
   Heuristic: the leading run before the first separator (colon / comma / dash /
   whitespace, ASCII or full-width). Falls back to the whole point. */
function coreKeyword(point: string): string {
  const match = point.match(/^[^\s:：,，、\-—]+/)
  return (match ? match[0] : point).trim()
}

/** How many points have been covered, by scanning the spoken transcript for each
   point's core keyword (case-insensitive substring match).

   Heuristic: a point counts as covered when its core keyword (the leading token
   before the first separator) appears anywhere in `spokenText`. Returns a count
   in 0..points.length. Empty keywords never match. */
export function progressThroughPoints(points: string[], spokenText: string): number {
  const haystack = spokenText.toLowerCase()
  let covered = 0
  for (const point of points) {
    const keyword = coreKeyword(point).toLowerCase()
    if (keyword.length > 0 && haystack.includes(keyword)) covered += 1
  }
  return covered
}

/** Freeze the cue once the candidate starts talking so it does not shift under
   them. Mirrors `candidateSpeaking` directly. */
export function shouldFreezeSuggestions(candidateSpeaking: boolean): boolean {
  return candidateSpeaking
}

/** Whether to surface a score. A formal live interview shows none by default;
   practice mode does. */
export function shouldShowScore(mode: 'practice' | 'live'): boolean {
  return mode === 'practice'
}

/** The next uncovered point to return to after an interruption, or null when the
   candidate has already covered everything. `lastCoveredIndex` is a count of
   covered points (0..points.length), as returned by progressThroughPoints. */
export function resumePointAfterInterruption(
  points: string[],
  lastCoveredIndex: number
): string | null {
  const next = Math.max(0, lastCoveredIndex)
  if (next >= points.length) return null
  return points[next]
}
