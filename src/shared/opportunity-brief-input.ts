/** Pure adapters that turn the app's freeform text (a MemoryProfile's fields and
   a pasted job description) into the structured CandidateProfile / JobDescription
   that opportunity-brief.ts consumes. Kept separate and pure so the parsing rules
   are unit-testable without any UI or store.

   Pure: no IO, no clock, no randomness; never mutates inputs. */

import type { CandidateProfile, JobDescription } from './opportunity-brief'

/** Split freeform text into trimmed, non-empty items. Accepts newline, comma,
   Chinese comma/enumeration comma, and semicolon as separators, and strips a
   leading list marker (-, *, •, or "1." style) from each line. */
export function splitTerms(text: string): string[] {
  if (!text) return []
  return text
    .split(/[\n,，、;；]+/)
    .map((part) => part.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((part) => part.length > 0)
}

// Lines that look like a project heading: "Name: highlight; highlight" or
// "Name - highlight". The part before the first colon/dash is the name.
function parseProjectLine(line: string): {
  name: string
  highlights: string[]
  metrics?: string[]
} | null {
  const trimmed = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()
  if (!trimmed) return null
  const sep = trimmed.search(/[:：]|\s[-–—]\s/)
  if (sep === -1) {
    return { name: trimmed, highlights: [] }
  }
  const name = trimmed.slice(0, sep).trim()
  const rest = trimmed
    .slice(sep)
    .replace(/^[:：]|^\s[-–—]\s/, '')
    .trim()
  const highlights = splitTerms(rest)
  // A metric highlight is one containing a digit (e.g. "QPS 提升 3x", "99.9%").
  const metrics = highlights.filter((h) => /\d/.test(h))
  const project: { name: string; highlights: string[]; metrics?: string[] } = { name, highlights }
  if (metrics.length > 0) project.metrics = metrics
  return project
}

export interface ProfileTextFields {
  techStack: string
  projects: string
  highlights: string
  avoid: string
}

/** Build a structured CandidateProfile from a MemoryProfile's freeform fields.
   - techStack: comma/newline separated terms.
   - projects: one project per line ("Name: h1; h2"); a highlight with a digit
     is also collected as a metric.
   - highlights → strengths; avoid → weaknesses. */
export function profileToCandidate(fields: ProfileTextFields): CandidateProfile {
  const projects = fields.projects
    .split(/\n+/)
    .map(parseProjectLine)
    .filter((p): p is NonNullable<typeof p> => p !== null)
  return {
    techStack: splitTerms(fields.techStack),
    projects,
    strengths: splitTerms(fields.highlights),
    weaknesses: splitTerms(fields.avoid)
  }
}

export interface JobDescriptionInput {
  title: string
  company: string
  mustHave: string
  niceToHave: string
  keywords: string
}

/** Build a structured JobDescription from the panel's text inputs. */
export function parseJobDescription(input: JobDescriptionInput): JobDescription {
  return {
    title: input.title.trim(),
    company: input.company.trim(),
    mustHave: splitTerms(input.mustHave),
    niceToHave: splitTerms(input.niceToHave),
    keywords: splitTerms(input.keywords)
  }
}
