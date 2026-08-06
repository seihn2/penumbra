/** Pure logic for the "history, branching & answer library" surface (历史、分支和答案库).

   This module powers three product ideas, all as pure functions that never read
   the clock or a random source (callers pass any ids/timestamps in):

     1. Search & filter — find past interview sessions by free-text query plus
        exact company/role/question-type facets, and enumerate the facet values
        for filter dropdowns.
     2. Branching — fork a NEW session from any turn of an existing one, copying
        the transcript up to (and including) a chosen line. The caller appends
        the returned record; this module never mutates the source array.
     3. Answer library / snapshots — flag whether a stored session still carries
        its visual context (screenshots) or has been reduced to review-only.

   Determinism: nothing here reads the wall clock or a random source. Anything
   that needs a timestamp or id takes it as an explicit argument, so behaviour is
   fully testable. */

export interface SessionRecord {
  id: string
  createdAt: number
  title: string
  company?: string
  role?: string
  /** e.g. 'coding' | 'system-design' | 'behavioral'. */
  questionType?: string
  /** Searchable concatenated content of the session (transcript + answers). */
  text: string
  /** false => screenshots were stripped, so the record is review-only. */
  hasVisualContext: boolean
}

export interface HistoryFilter {
  query?: string
  company?: string
  role?: string
  questionType?: string
}

export type CompletenessFlag = 'full' | 'review-only'

/** Marker appended to `text` when a session is reduced to review-only. Exported
    so callers/tests can detect the note without hard-coding the string. */
export const REVIEW_ONLY_NOTE = '[review-only] visual context missing'

/** Search + filter sessions.

    - `query` is a case-insensitive substring test across title + text + company
      + role. An empty/whitespace-only query matches everything.
    - `company` / `role` / `questionType` are exact, case-insensitive equality
      filters, applied only when provided (non-empty after trim).
    - All active conditions are AND-combined.

    Input order is preserved and the input array is never mutated (a new array
    is returned). */
export function searchSessions(
  sessions: readonly SessionRecord[],
  filter: HistoryFilter = {}
): SessionRecord[] {
  const query = normalize(filter.query)
  const company = normalize(filter.company)
  const role = normalize(filter.role)
  const questionType = normalize(filter.questionType)

  return sessions.filter((session) => {
    if (query && !matchesQuery(session, query)) return false
    if (company && normalize(session.company) !== company) return false
    if (role && normalize(session.role) !== role) return false
    if (questionType && normalize(session.questionType) !== questionType) return false
    return true
  })
}

/** Enumerate the distinct facet values for filter dropdowns. Each list holds
    the sorted, unique, non-empty values; undefined/blank fields are ignored. */
export function facets(sessions: readonly SessionRecord[]): {
  companies: string[]
  roles: string[]
  questionTypes: string[]
} {
  return {
    companies: uniqueSorted(sessions.map((session) => session.company)),
    roles: uniqueSorted(sessions.map((session) => session.role)),
    questionTypes: uniqueSorted(sessions.map((session) => session.questionType))
  }
}

/** Fork a NEW session from a source session, copying its `text` up to and
    including line `atIndex` (lines are split on '\n'). `atIndex` is clamped to
    the valid range. The new record carries the caller-supplied `newId` and
    `now`, a ' (branch)' title suffix, and inherits the source's facets.

    Returns null when the source id is not found. Never mutates the input array
    — the caller is responsible for appending the returned record. */
export function branchFrom(
  sessions: readonly SessionRecord[],
  sessionId: string,
  atIndex: number,
  options: { newId: string; now: number }
): SessionRecord | null {
  const source = sessions.find((session) => session.id === sessionId)
  if (!source) return null

  const lines = source.text.split('\n')
  const clamped = Math.max(0, Math.min(atIndex, lines.length - 1))
  const text = lines.slice(0, clamped + 1).join('\n')

  return {
    ...source,
    id: options.newId,
    createdAt: options.now,
    title: `${source.title} (branch)`,
    text
  }
}

/** Reduce a session to review-only: drop the visual-context flag and append a
    note to its text. This models snapshot recovery where the screenshots could
    not be restored — the transcript/answers survive for review, but the visual
    context is gone. (A future "recovery keeps visual summary" path would instead
    keep `hasVisualContext: true` and store a text summary of the images.)

    Returns a copy; the input is never mutated. Idempotent — re-marking an
    already review-only session does not append the note twice. */
export function markReviewOnly(session: SessionRecord): SessionRecord {
  const text = session.text.includes(REVIEW_ONLY_NOTE)
    ? session.text
    : `${session.text}\n${REVIEW_ONLY_NOTE}`
  return {
    ...session,
    hasVisualContext: false,
    text
  }
}

/** 'full' when the session still has its screenshots, else 'review-only'. */
export function completenessFlag(session: SessionRecord): CompletenessFlag {
  return session.hasVisualContext ? 'full' : 'review-only'
}

/** Drop duplicate sessions by id, keeping the FIRST occurrence and preserving
    order. Returns a new array; the input is never mutated. */
export function dedupeSessions(sessions: readonly SessionRecord[]): SessionRecord[] {
  const seen = new Set<string>()
  const result: SessionRecord[] = []
  for (const session of sessions) {
    if (seen.has(session.id)) continue
    seen.add(session.id)
    result.push(session)
  }
  return result
}

/** Lower-case + trim a possibly-undefined string; '' means "no value". */
function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/** Case-insensitive substring match of an already-normalized query across the
    session's title, text, company and role. */
function matchesQuery(session: SessionRecord, query: string): boolean {
  const haystack = [session.title, session.text, session.company, session.role]
    .map((part) => (part ?? '').toLowerCase())
    .join('\n')
  return haystack.includes(query)
}

/** Collect the non-empty (trimmed) values from a list, de-duplicate, and sort. */
function uniqueSorted(values: readonly (string | undefined)[]): string[] {
  const set = new Set<string>()
  for (const value of values) {
    const trimmed = (value ?? '').trim()
    if (trimmed) set.add(trimmed)
  }
  return [...set].sort()
}
