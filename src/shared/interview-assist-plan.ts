export const INTERVIEW_ASSIST_KINDS = [
  'project',
  'behavioral',
  'system-design',
  'algorithm',
  'concept',
  'general'
] as const

export type InterviewAssistKind = (typeof INTERVIEW_ASSIST_KINDS)[number]

export interface InterviewAssistPlan {
  kind: InterviewAssistKind | null
  opening: string
  path: string[]
  evidence: string[]
  followUps: string[]
  avoid: string[]
  structured: boolean
  raw: string
}

type SectionName = 'type' | 'opening' | 'path' | 'evidence' | 'followUp' | 'avoid'

const SECTION_MARKERS: Record<string, SectionName> = {
  TYPE: 'type',
  OPENING: 'opening',
  PATH: 'path',
  EVIDENCE: 'evidence',
  FOLLOW_UP: 'followUp',
  AVOID: 'avoid'
}

const LIST_PREFIX = /^\s*(?:[-*•]|\d+[.)])\s*/

export function parseInterviewAssistPlan(raw: string): InterviewAssistPlan {
  const sections: Record<SectionName, string[]> = {
    type: [],
    opening: [],
    path: [],
    evidence: [],
    followUp: [],
    avoid: []
  }
  let currentSection: SectionName | null = null
  let markerCount = 0

  for (const sourceLine of raw.replace(/\r\n?/g, '\n').split('\n')) {
    const line = sourceLine.trim()
    const marker = line.match(/^\[(TYPE|OPENING|PATH|EVIDENCE|FOLLOW_UP|AVOID)\](?:\s*(.*))?$/i)
    if (marker) {
      currentSection = SECTION_MARKERS[marker[1].toUpperCase()]
      markerCount += 1
      if (marker[2]?.trim()) sections[currentSection].push(marker[2].trim())
      continue
    }
    if (currentSection && line) sections[currentSection].push(line)
  }

  if (markerCount === 0) {
    return {
      kind: null,
      opening: '',
      path: [],
      evidence: [],
      followUps: [],
      avoid: [],
      structured: false,
      raw
    }
  }

  const kindText = sections.type.join(' ').trim().toLowerCase()
  const kind = INTERVIEW_ASSIST_KINDS.includes(kindText as InterviewAssistKind)
    ? (kindText as InterviewAssistKind)
    : null

  return {
    kind,
    opening: cleanParagraph(sections.opening),
    path: cleanList(sections.path),
    evidence: cleanList(sections.evidence),
    followUps: cleanList(sections.followUp),
    avoid: cleanList(sections.avoid),
    structured: true,
    raw
  }
}

function cleanParagraph(lines: string[]): string {
  return lines
    .map((line) => line.replace(LIST_PREFIX, '').trim())
    .filter(Boolean)
    .join(' ')
}

function cleanList(lines: string[]): string[] {
  return lines
    .map((line) => line.replace(LIST_PREFIX, '').trim())
    .filter((line) => line && line !== '-')
}
