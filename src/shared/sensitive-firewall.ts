/** Local sensitive-info firewall.

   Pure, deterministic helpers that scrub secrets and PII out of text BEFORE it
   leaves the machine, replacing each hit with a SEMANTIC placeholder (so the AI
   still understands "an API key was here" without seeing the value). There is
   no I/O here: no network, no filesystem, no clock reads, no randomness. That
   keeps the detection logic unit-testable and makes redaction reproducible.

   Design notes / tradeoffs:
   - Detection uses robust-but-simple regexes. We deliberately keep them fairly
     specific to avoid mangling ordinary prose or code identifiers. The known
     tradeoffs: a bare 11-digit CN-style number is treated as a phone, and a
     long (32+ char) alnum blob that directly follows a key/token/secret hint is
     treated as a secret. Both are acceptable for a firewall that errs slightly
     toward caution around leaks.
   - The user "never-send" list is matched case-insensitively on whole tokens
     and always wins over the built-in detectors.
   - Placeholders are emitted in the form `[REDACTED_CATEGORY]`. Redaction is
     idempotent: existing placeholders are protected regions and are never
     re-redacted, so redactText(redactText(x).text).text === redactText(x).text. */

export type RedactionCategory =
  | 'api-key'
  | 'token'
  | 'email'
  | 'phone'
  | 'meeting-id'
  | 'repo-path'
  | 'custom'

export interface Redaction {
  category: RedactionCategory
  original: string
  placeholder: string
  start: number
  end: number
}

export interface RedactionResult {
  text: string
  redactions: Redaction[]
}

export interface RedactOptions {
  neverSend?: string[]
}

const PLACEHOLDERS: Record<RedactionCategory, string> = {
  'api-key': '[REDACTED_API_KEY]',
  token: '[REDACTED_TOKEN]',
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
  'meeting-id': '[REDACTED_MEETING_ID]',
  'repo-path': '[REDACTED_REPO_PATH]',
  custom: '[REDACTED_CUSTOM]'
}

const ALL_CATEGORIES: RedactionCategory[] = [
  'api-key',
  'token',
  'email',
  'phone',
  'meeting-id',
  'repo-path',
  'custom'
]

/** Lower number = higher priority when two candidate matches overlap. custom
   (the never-send list) always wins; meeting-id beats phone so a meeting id is
   not mislabeled as a phone number. */
const PRIORITY: Record<RedactionCategory, number> = {
  custom: 0,
  'api-key': 1,
  token: 2,
  email: 3,
  'meeting-id': 4,
  'repo-path': 5,
  phone: 6
}

interface DetectorRule {
  category: RedactionCategory
  regex: RegExp
}

// Built-in detectors. Each regex matches ONLY the sensitive span (lookbehind is
// used to require context hints without swallowing them), so match.index and
// the match length map straight onto the original text.
const DETECTORS: DetectorRule[] = [
  // api-key: sk-... style, AWS AKIA..., and long secrets right after a hint.
  { category: 'api-key', regex: /sk-[A-Za-z0-9]{16,}/g },
  { category: 'api-key', regex: /AKIA[0-9A-Z]{16}/g },
  {
    category: 'api-key',
    regex: /(?<=(?:api[_-]?key|apikey|secret|key)["'\s:=]{1,4})[A-Za-z0-9+/=]{32,}/gi
  },
  // token: Bearer <token>, GitHub ghp_..., Slack xox[baprs]-...
  { category: 'token', regex: /(?<=Bearer\s{1,4})[A-Za-z0-9\-._~+/]{8,}=*/g },
  { category: 'token', regex: /ghp_[A-Za-z0-9]{20,}/g },
  { category: 'token', regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  {
    category: 'token',
    regex: /(?<=token["'\s:=]{1,4})[A-Za-z0-9+/=]{32,}/gi
  },
  // email: standard address.
  { category: 'email', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // meeting-id: 9-11 digits near a zoom/meeting/会议 hint (conservative).
  { category: 'meeting-id', regex: /(?<=(?:zoom|meeting|会议)[^\d]{0,20})\d{9,11}/gi },
  // repo-path: local filesystem paths under a user home.
  { category: 'repo-path', regex: /\/Users\/[^\s/]+(?:\/[^\s]*)?/g },
  { category: 'repo-path', regex: /[A-Za-z]:\\Users\\[^\s\\]+(?:\\[^\s]*)?/g },
  // phone: E.164, CN mobile (11 digits from 1, optional dashes), US formats.
  { category: 'phone', regex: /\+\d{7,15}\b/g },
  { category: 'phone', regex: /\(\d{3}\)\s*\d{3}-\d{4}/g },
  { category: 'phone', regex: /\b1\d{2}-\d{4}-\d{4}\b/g },
  { category: 'phone', regex: /\b1\d{10}\b/g },
  { category: 'phone', regex: /\b\d{3}-\d{3}-\d{4}\b/g }
]

// Matches placeholders already present in the text; these regions are protected
// so a second pass does not re-redact them (idempotency).
const PLACEHOLDER_REGEX = /\[REDACTED_[A-Z_]+\]/g

interface Candidate {
  category: RedactionCategory
  original: string
  start: number
  end: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collectMatches(input: string, regex: RegExp, category: RedactionCategory): Candidate[] {
  const found: Candidate[] = []
  // Clone so the shared literal's lastIndex is never mutated across calls.
  const scanner = new RegExp(regex.source, regex.flags)
  let match: RegExpExecArray | null
  while ((match = scanner.exec(input)) !== null) {
    const original = match[0]
    if (original.length === 0) {
      scanner.lastIndex += 1
      continue
    }
    found.push({ category, original, start: match.index, end: match.index + original.length })
  }
  return found
}

function collectProtectedRanges(input: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const scanner = new RegExp(PLACEHOLDER_REGEX.source, PLACEHOLDER_REGEX.flags)
  let match: RegExpExecArray | null
  while ((match = scanner.exec(input)) !== null) {
    ranges.push([match.index, match.index + match[0].length])
  }
  return ranges
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Detect sensitive spans and replace each with a semantic placeholder. The
   returned redactions carry the span's position in the ORIGINAL input. */
export function redactText(input: string, opts: RedactOptions = {}): RedactionResult {
  if (!input) return { text: input, redactions: [] }

  const protectedRanges = collectProtectedRanges(input)

  const candidates: Candidate[] = []

  // Never-send list first — highest priority, whole-token, case-insensitive.
  const neverSend = (opts.neverSend ?? []).map((w) => w.trim()).filter((w) => w.length > 0)
  for (const word of neverSend) {
    const rule = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi')
    for (const hit of collectMatches(input, rule, 'custom')) candidates.push(hit)
  }

  // Built-in detectors.
  for (const detector of DETECTORS) {
    for (const hit of collectMatches(input, detector.regex, detector.category)) candidates.push(hit)
  }

  // Resolve overlaps deterministically: earliest start, then priority, then the
  // longer span. Greedily accept non-overlapping spans; drop anything landing
  // inside an existing placeholder.
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    if (PRIORITY[a.category] !== PRIORITY[b.category]) {
      return PRIORITY[a.category] - PRIORITY[b.category]
    }
    return b.end - b.start - (a.end - a.start)
  })

  const accepted: Candidate[] = []
  for (const candidate of candidates) {
    const insideProtected = protectedRanges.some(([s, e]) =>
      overlaps(candidate.start, candidate.end, s, e)
    )
    if (insideProtected) continue
    const clashes = accepted.some((a) => overlaps(candidate.start, candidate.end, a.start, a.end))
    if (clashes) continue
    accepted.push(candidate)
  }

  accepted.sort((a, b) => a.start - b.start)

  const redactions: Redaction[] = accepted.map((c) => ({
    category: c.category,
    original: c.original,
    placeholder: PLACEHOLDERS[c.category],
    start: c.start,
    end: c.end
  }))

  let text = ''
  let cursor = 0
  for (const r of redactions) {
    text += input.slice(cursor, r.start)
    text += r.placeholder
    cursor = r.end
  }
  text += input.slice(cursor)

  return { text, redactions }
}

/** True when at least one sensitive span is detected. */
export function hasSensitive(input: string, opts: RedactOptions = {}): boolean {
  return redactText(input, opts).redactions.length > 0
}

/** Stronger pass for the "share" export: strips the never-send list plus all
   built-in secrets and returns share-safe text. */
export function anonymizeForShare(input: string, opts: RedactOptions = {}): string {
  return redactText(input, opts).text
}

/** Tally the redactions by category, with every category present (0 default). */
export function countByCategory(result: RedactionResult): Record<RedactionCategory, number> {
  const counts = {} as Record<RedactionCategory, number>
  for (const category of ALL_CATEGORIES) counts[category] = 0
  for (const r of result.redactions) counts[r.category] += 1
  return counts
}
