/** Context Compiler ("上下文编译器").

   Instead of dumping the full conversation history into every AI request, this
   module compiles a compact `ContextManifest` that fits a token budget. It keeps
   different information kinds separate (facts vs. AI inferences vs. user
   constraints vs. unconfirmed), so the model is never fed a guess dressed up as a
   fact, and the user can inspect what the AI "remembers this time".

   Everything here is pure: no clocks, no randomness, no I/O, and inputs are never
   mutated. */

/** How a piece of context should be trusted.
   - fact:            objective, verified information
   - user-constraint: a requirement the user explicitly confirmed (hard constraint)
   - ai-inference:    something the AI deduced; a guess, not ground truth
   - unconfirmed:     captured but not yet validated (lowest trust) */
export type InfoKind = 'fact' | 'user-constraint' | 'ai-inference' | 'unconfirmed'

/** A single candidate slice of context (typically one conversation turn). */
export interface ContextItem {
  turnId: string
  text: string
  kind: InfoKind
  estimatedTokens: number
}

/** The compiled, budget-fitted context handed to the AI for one request. */
export interface ContextManifest {
  currentQuestion: string
  hardConstraints: string[]
  topicSummary: string
  historyExcerpts: { turnId: string; text: string }[]
  screenshots: string[]
  profileFields: { key: string; value: string }[]
  excluded: { turnId: string; reason: 'compressed' | 'budget' | 'irrelevant' }[]
  inputTokenBudget: number
  outputReservation: number
}

export interface CompileBudgetConfig {
  modelContextWindow: number
}

export interface CompileContextInput {
  currentQuestion: string
  items: ContextItem[]
  constraints: string[]
  summary: string
  screenshots: string[]
  profileFields: { key: string; value: string }[]
  budget: CompileBudgetConfig
}

/** Minimum tokens always reserved for the model's own output. */
export const MIN_OUTPUT_RESERVATION = 2048

/** Fraction of the context window reserved for output (the rest is input). */
export const OUTPUT_RESERVATION_RATIO = 0.2

/** Estimate the number of tokens in a string.

   Heuristic (deterministic, CJK-aware): CJK characters (Han, Hiragana, Katakana,
   Hangul) each roughly cost one token, while other text (ASCII/Latin, whitespace,
   punctuation) averages ~4 characters per token. We count CJK code points, then
   charge the remaining characters at 1/4 token each:

     tokens = cjkCount + ceil(nonCjkCount / 4)

   This is intentionally simple and stable — no model dependency, same input always
   yields the same number. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const cjkPattern = /[㐀-䶿一-鿿豈-﫿぀-ゟ゠-ヿ가-힯]/
  let cjkCount = 0
  for (const ch of text) {
    if (cjkPattern.test(ch)) cjkCount += 1
  }
  const nonCjkCount = [...text].length - cjkCount
  return cjkCount + Math.ceil(nonCjkCount / 4)
}

/** Numeric priority for greedy inclusion. Lower number = included first. */
const KIND_PRIORITY: Record<InfoKind, number> = {
  'user-constraint': 0,
  fact: 1,
  'ai-inference': 2,
  unconfirmed: 3
}

/** Kinds that are always kept regardless of budget. */
function isAlwaysIncluded(kind: InfoKind): boolean {
  return kind === 'user-constraint'
}

/** Compile candidate context into a budget-fitted manifest.

   Rules enforced:
   - outputReservation = max(2048, floor(window * 0.20))
   - inputTokenBudget  = floor(window * 0.80)
   - currentQuestion and user-constraint items are ALWAYS included (never dropped
     for budget).
   - remaining items are added greedily by priority (facts, then ai-inference, then
     unconfirmed); anything that no longer fits is excluded with reason 'budget'.
   - kinds are kept separate: an ai-inference is never promoted into hardConstraints
     or presented as a fact. */
export function compileContext(input: CompileContextInput): ContextManifest {
  const window = input.budget.modelContextWindow
  const outputReservation = Math.max(
    MIN_OUTPUT_RESERVATION,
    Math.floor(window * OUTPUT_RESERVATION_RATIO)
  )
  const inputTokenBudget = Math.floor(window * (1 - OUTPUT_RESERVATION_RATIO))

  // Copy inputs defensively so we never mutate what the caller passed in.
  const items = [...input.items]

  // hardConstraints come only from user-confirmed constraints — never inferences.
  const hardConstraints = [...input.constraints]

  // Order candidates by kind priority while preserving original order within a kind
  // (stable sort keeps the caller's intended ordering for equal-priority items).
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byKind = KIND_PRIORITY[a.item.kind] - KIND_PRIORITY[b.item.kind]
      return byKind !== 0 ? byKind : a.index - b.index
    })
    .map((entry) => entry.item)

  // Reserve budget for the parts that are always present.
  const questionTokens = estimateTokens(input.currentQuestion)
  const constraintTokens = hardConstraints.reduce((sum, c) => sum + estimateTokens(c), 0)
  const summaryTokens = estimateTokens(input.summary)
  const profileTokens = input.profileFields.reduce(
    (sum, f) => sum + estimateTokens(f.key) + estimateTokens(f.value),
    0
  )

  let used = questionTokens + constraintTokens + summaryTokens + profileTokens

  // Always-included items (user-constraint) are consumed first and never excluded.
  for (const item of ordered) {
    if (isAlwaysIncluded(item.kind)) used += item.estimatedTokens
  }

  const historyExcerpts: { turnId: string; text: string }[] = []
  const excluded: { turnId: string; reason: 'compressed' | 'budget' | 'irrelevant' }[] = []

  // user-constraint items are surfaced both as hard constraints and as excerpts,
  // and are never dropped.
  for (const item of ordered) {
    if (isAlwaysIncluded(item.kind)) {
      historyExcerpts.push({ turnId: item.turnId, text: item.text })
    }
  }

  // Greedily fit the remaining (non-always) items by priority.
  for (const item of ordered) {
    if (isAlwaysIncluded(item.kind)) continue
    if (used + item.estimatedTokens <= inputTokenBudget) {
      used += item.estimatedTokens
      historyExcerpts.push({ turnId: item.turnId, text: item.text })
    } else {
      excluded.push({ turnId: item.turnId, reason: 'budget' })
    }
  }

  return {
    currentQuestion: input.currentQuestion,
    hardConstraints,
    topicSummary: input.summary,
    historyExcerpts,
    screenshots: [...input.screenshots],
    profileFields: input.profileFields.map((f) => ({ key: f.key, value: f.value })),
    excluded,
    inputTokenBudget,
    outputReservation
  }
}

/** Produce a short, human-readable summary of what the AI "remembers this time",
   so the user can inspect the compiled context. */
export function summarizeManifestForUser(manifest: ContextManifest): string {
  const lines: string[] = []
  lines.push(`当前问题：${manifest.currentQuestion || '（无）'}`)
  lines.push(`硬性约束：${manifest.hardConstraints.length} 条`)
  lines.push(`话题摘要：${manifest.topicSummary ? '有' : '无'}`)
  lines.push(`历史片段：${manifest.historyExcerpts.length} 条`)
  lines.push(`截图：${manifest.screenshots.length} 张`)
  lines.push(`档案字段：${manifest.profileFields.length} 项`)
  lines.push(`已排除：${manifest.excluded.length} 条`)
  lines.push(`输入预算：${manifest.inputTokenBudget} tokens`)
  lines.push(`输出预留：${manifest.outputReservation} tokens`)
  return lines.join('\n')
}
