/** Per-interview "opportunity brief" builder ("机会资料包").

   From a job description (JD), a company, and the candidate's own experience,
   this module assembles a per-interview brief: focus areas, projects to tell,
   key metrics, likely follow-ups, technical deep-dives, behavioral material,
   questions to ask back, and risks/weak spots.

   It is a PURE, rule-based assembler + matcher over the provided inputs — no
   AI, no network, no Date.now/Math.random. Every function is deterministic and
   never mutates its inputs. */

export interface CandidateProfile {
  techStack: string[]
  projects: { name: string; highlights: string[]; metrics?: string[] }[]
  strengths: string[]
  weaknesses: string[]
}

export interface JobDescription {
  title: string
  company: string
  mustHave: string[]
  niceToHave: string[]
  keywords: string[]
}

export interface OpportunityBrief {
  focusAreas: string[] // JD must-haves the candidate has, prioritized
  gaps: string[] // JD must-haves the candidate LACKS (risks)
  projectsToTell: { name: string; why: string }[] // projects matching JD keywords
  keyMetrics: string[]
  likelyFollowUps: string[]
  deepDives: string[] // tech from stack ∩ JD
  behavioralMaterial: string[]
  questionsToAsk: string[]
  risks: string[]
}

/** Max number of projects surfaced in a brief. */
const MAX_PROJECTS = 5

/** Case-insensitive, trimmed comparison key for matching terms. */
function normalize(term: string): string {
  return term.trim().toLowerCase()
}

/** Push value into arr only when it is truthy and not already present. */
function pushUnique(arr: string[], value: string): void {
  if (value && !arr.includes(value)) arr.push(value)
}

/** Case-insensitive intersection of the candidate's tech stack with the JD's
    must-haves. `covered` are must-haves the candidate has (order follows the
    JD must-haves); `missing` are must-haves absent from the stack. */
export function matchStack(
  profile: CandidateProfile,
  jd: JobDescription
): { covered: string[]; missing: string[] } {
  const stackKeys = new Set(profile.techStack.map(normalize))
  const covered: string[] = []
  const missing: string[] = []
  for (const must of jd.mustHave) {
    const bucket = stackKeys.has(normalize(must)) ? covered : missing
    pushUnique(bucket, must)
  }
  return { covered, missing }
}

/** Projects whose name or any highlight contains a JD keyword
    (case-insensitive). `why` names the first keyword that matched. Preserves
    project order and caps the result at MAX_PROJECTS. */
export function selectProjects(
  profile: CandidateProfile,
  jd: JobDescription
): { name: string; why: string }[] {
  const keywords = jd.keywords.map((kw) => ({ raw: kw, key: normalize(kw) })).filter((k) => k.key)
  const selected: { name: string; why: string }[] = []
  for (const project of profile.projects) {
    if (selected.length >= MAX_PROJECTS) break
    const haystack = [project.name, ...project.highlights].map(normalize)
    const match = keywords.find((kw) => haystack.some((text) => text.includes(kw.key)))
    if (match) selected.push({ name: project.name, why: `匹配关键词「${match.raw}」` })
  }
  return selected
}

/** Flatten every project's metrics into a single list, de-duplicated while
    preserving first-seen order. */
export function collectMetrics(profile: CandidateProfile): string[] {
  const metrics: string[] = []
  for (const project of profile.projects) {
    for (const metric of project.metrics ?? []) pushUnique(metrics, metric)
  }
  return metrics
}

/** Case-insensitive intersection of the candidate's tech stack with the union
    of the JD's must-haves and nice-to-haves. Order follows the tech stack. */
function collectDeepDives(profile: CandidateProfile, jd: JobDescription): string[] {
  const jdKeys = new Set([...jd.mustHave, ...jd.niceToHave].map(normalize))
  const deepDives: string[] = []
  for (const tech of profile.techStack) {
    if (jdKeys.has(normalize(tech))) pushUnique(deepDives, tech)
  }
  return deepDives
}

/** Assemble the full opportunity brief from a candidate profile and a JD.
    Deterministic and de-duplicated where sensible; never mutates inputs. */
export function buildBrief(profile: CandidateProfile, jd: JobDescription): OpportunityBrief {
  const { covered, missing } = matchStack(profile, jd)

  const behavioralMaterial: string[] = []
  for (const strength of profile.strengths) {
    pushUnique(behavioralMaterial, `准备一个体现「${strength}」的故事（STAR）`)
  }

  const questionsToAsk: string[] = []
  for (const nice of jd.niceToHave) pushUnique(questionsToAsk, `团队如何使用 ${nice}?`)
  for (const kw of jd.keywords) pushUnique(questionsToAsk, `${kw} 在团队中的现状如何?`)

  const likelyFollowUps: string[] = []
  for (const area of covered) pushUnique(likelyFollowUps, `深入聊聊 ${area} 的实践`)

  const risks: string[] = []
  for (const gap of missing) pushUnique(risks, gap)
  for (const weakness of profile.weaknesses) pushUnique(risks, weakness)

  return {
    focusAreas: covered,
    gaps: missing,
    projectsToTell: selectProjects(profile, jd),
    keyMetrics: collectMetrics(profile),
    likelyFollowUps,
    deepDives: collectDeepDives(profile, jd),
    behavioralMaterial,
    questionsToAsk,
    risks
  }
}
