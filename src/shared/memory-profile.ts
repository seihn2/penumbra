/** Structured personal memory profile. Replaces the single free-text blob with
   named fields so the AI receives clearly-labeled background instead of one
   undifferentiated dump. A profile also carries a name so users can keep
   several (e.g. "投后端岗" vs "投算法岗") and switch between them. */
export interface MemoryProfile {
  id: string
  name: string
  targetRole: string
  techStack: string
  projects: string
  highlights: string
  avoid: string
  freeform: string
}

/** The persisted memory state: a set of profiles plus which one is active. */
export interface MemoryState {
  profiles: MemoryProfile[]
  activeProfileId: string
}

export function createEmptyProfile(id: string, name: string): MemoryProfile {
  return {
    id,
    name,
    targetRole: '',
    techStack: '',
    projects: '',
    highlights: '',
    avoid: '',
    freeform: ''
  }
}

/** Whether a profile carries no usable content (all fields blank). */
export function isProfileEmpty(profile: MemoryProfile): boolean {
  return (
    !profile.targetRole.trim() &&
    !profile.techStack.trim() &&
    !profile.projects.trim() &&
    !profile.highlights.trim() &&
    !profile.avoid.trim() &&
    !profile.freeform.trim()
  )
}

/** Migrate the legacy single `userMemory` string into a one-profile state. The
   old blob has no structure, so it lands in `freeform` verbatim. A blank string
   yields a single empty default profile so the UI always has something to edit. */
export function migrateLegacyMemory(legacy: string | undefined | null): MemoryState {
  const profile = createEmptyProfile('default', '默认档案')
  if (legacy && legacy.trim()) profile.freeform = legacy.trim()
  return { profiles: [profile], activeProfileId: profile.id }
}

/** Resolve the active profile, falling back to the first one if the active id
   is stale, or to a fresh empty profile if there are none. */
export function getActiveProfile(state: MemoryState): MemoryProfile {
  return (
    state.profiles.find((p) => p.id === state.activeProfileId) ??
    state.profiles[0] ??
    createEmptyProfile('default', '默认档案')
  )
}

const FIELD_LABELS: { key: keyof MemoryProfile; label: string }[] = [
  { key: 'targetRole', label: '目标岗位' },
  { key: 'techStack', label: '技术栈' },
  { key: 'projects', label: '项目经历' },
  { key: 'highlights', label: '想强调的亮点' },
  { key: 'avoid', label: '希望避免提及' }
]

/** Render a profile into the labeled text block that gets appended to the AI
   system prompt. Returns '' when the profile has no content, so callers can
   skip the surrounding wrapper. Only non-empty fields are included. */
export function profileToPromptText(profile: MemoryProfile): string {
  const lines: string[] = []
  for (const { key, label } of FIELD_LABELS) {
    const value = (profile[key] as string).trim()
    if (value) lines.push(`- ${label}：${value}`)
  }
  const freeform = profile.freeform.trim()
  if (freeform) lines.push(freeform)
  return lines.join('\n')
}

/** Serialize a MemoryState to a JSON string for persistence. */
export function serializeMemoryState(state: MemoryState): string {
  return JSON.stringify(state)
}

/** Parse a persisted memoryProfiles string into a MemoryState. Falls back to a
   single empty default profile on empty/corrupt input so the UI is never stuck
   with nothing to edit. `legacyFallback` (the old userMemory blob) seeds the
   default profile when there are no stored profiles yet. */
export function parseMemoryState(raw: string | undefined | null, legacyFallback = ''): MemoryState {
  if (!raw || !raw.trim()) return migrateLegacyMemory(legacyFallback)
  try {
    const parsed = JSON.parse(raw) as Partial<MemoryState>
    if (!parsed || !Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
      return migrateLegacyMemory(legacyFallback)
    }
    // Normalize each profile so missing fields can't crash the editor.
    const profiles = parsed.profiles.map((p) => ({
      ...createEmptyProfile(
        typeof p.id === 'string' ? p.id : 'default',
        typeof p.name === 'string' ? p.name : '默认档案'
      ),
      ...p
    }))
    const activeProfileId =
      typeof parsed.activeProfileId === 'string' ? parsed.activeProfileId : profiles[0].id
    return { profiles, activeProfileId }
  } catch {
    return migrateLegacyMemory(legacyFallback)
  }
}

/** The compiled prompt text for whichever profile is active. This is what gets
   mirrored into the legacy `userMemory` setting the AI prompt reads. */
export function activeProfilePromptText(state: MemoryState): string {
  return profileToPromptText(getActiveProfile(state))
}

/** A fact the AI proposes distilling from the live conversation. The user must
   confirm before it is merged into a profile (never auto-written). `field` is
   the structured slot it belongs to; `text` is the concise fact. */
export interface MemoryCandidate {
  field: keyof Pick<MemoryProfile, 'targetRole' | 'techStack' | 'projects' | 'highlights'>
  text: string
}

/** The fields a candidate may target — used to validate AI output. */
const CANDIDATE_FIELDS: MemoryCandidate['field'][] = [
  'targetRole',
  'techStack',
  'projects',
  'highlights'
]

export function isMemoryCandidateField(value: unknown): value is MemoryCandidate['field'] {
  return typeof value === 'string' && (CANDIDATE_FIELDS as string[]).includes(value)
}

// Cap how many candidates one distillation can propose, so a runaway model
// response can't flood the confirmation UI.
const MAX_CANDIDATES = 8
// Drop absurdly long "facts" — these are concise snippets, not paragraphs.
const MAX_CANDIDATE_LEN = 200

/** Parse the model's distillation output into validated candidates. The model
   is asked for a JSON array of {field, text}, but may wrap it in markdown
   fences or add prose — so we extract the first JSON array, then keep only
   well-formed entries (known field, non-empty short text), de-duplicated by
   field+text. Never throws: bad output yields an empty list. */
export function parseMemoryCandidates(raw: string | undefined | null): MemoryCandidate[] {
  if (!raw || !raw.trim()) return []
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  let arr: unknown
  try {
    arr = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []

  const out: MemoryCandidate[] = []
  const seen = new Set<string>()
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const { field, text } = item as { field?: unknown; text?: unknown }
    if (!isMemoryCandidateField(field) || typeof text !== 'string') continue
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_CANDIDATE_LEN) continue
    const key = `${field}::${trimmed.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ field, text: trimmed })
    if (out.length >= MAX_CANDIDATES) break
  }
  return out
}

/** Merge a confirmed candidate's text into a profile field without clobbering
   what's already there: append as a new line, and skip if the exact text is
   already present (case-insensitive, trimmed) so repeated distillations don't
   duplicate. Returns a new profile (pure). */
export function mergeCandidateIntoProfile(
  profile: MemoryProfile,
  candidate: MemoryCandidate
): MemoryProfile {
  const addition = candidate.text.trim()
  if (!addition) return profile
  const existing = profile[candidate.field].trim()
  // Already captured (exact line match, case-insensitive) → no change.
  const has = existing
    .split('\n')
    .some((line) => line.trim().toLowerCase() === addition.toLowerCase())
  if (has) return profile
  const next = existing ? `${existing}\n${addition}` : addition
  return { ...profile, [candidate.field]: next }
}

/** Apply several confirmed candidates to the active profile of a state, in
   order. Pure — returns a new state. */
export function applyCandidatesToActive(
  state: MemoryState,
  candidates: MemoryCandidate[]
): MemoryState {
  const active = getActiveProfile(state)
  let merged = active
  for (const c of candidates) merged = mergeCandidateIntoProfile(merged, c)
  if (merged === active) return state
  return {
    ...state,
    profiles: state.profiles.map((p) => (p.id === active.id ? merged : p))
  }
}

/** System prompt for the distillation model: extract NEW, durable facts about
   the candidate from the live conversation, as a strict JSON array that
   parseMemoryCandidates can consume. Kept pure/here so it's unit-testable. */
export const DISTILL_SYSTEM_PROMPT = `你在面试过程中默默帮候选人积累"个人档案"。请只从候选人**自己说过的话**里，提炼出值得长期保存的事实，用于完善他们的简历式档案。

只输出一个 JSON 数组，每个元素形如 {"field": "...", "text": "..."}：
- field 只能是：targetRole（目标岗位）、techStack（技术栈/掌握的技术）、projects（做过的项目与成果）、highlights（值得强调的亮点）。
- text 是简洁的一条事实（不超过 50 字），用候选人的口吻陈述，不要编造、不要加入面试官的话。
- 只提炼**新**信息：下面给出的"已有档案"中已经包含的内容不要重复。
- 如果没有值得新增的事实，就输出空数组 []。

不要输出 JSON 以外的任何文字、解释或 markdown 代码块标记。`

/** Build the user-prompt for distillation: the recent conversation plus a
   snapshot of what the active profile already knows (so the model skips known
   facts). Pure string assembly — the AI call consumes this. */
export function buildDistillationPrompt(context: string, activeProfile: MemoryProfile): string {
  const known = profileToPromptText(activeProfile).trim()
  const knownBlock = known ? `已有档案（不要重复其中的信息）：\n${known}` : '已有档案：（空）'
  return `${knownBlock}\n\n最近对话：\n${context.trim()}\n\n请按要求输出 JSON 数组。`
}
