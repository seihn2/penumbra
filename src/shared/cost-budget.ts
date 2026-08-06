/** Pure decision logic for the "cost & latency budget" (成本与延迟预算).

   A live session issues many kinds of AI calls — the core answer ('solve'),
   interview assists, translations, periodic summaries, and proactive "vibe"
   suggestions. Left unbounded they burn tokens/money and add latency. This
   module lets the user cap per-session requests, tokens, and cost, throttle
   the frequency of the noisy background tasks (translation/summary/proactive),
   and pick a priority order. When a threshold is hit the app DEGRADES per the
   user's settings rather than abruptly killing the core answer.

   Everything here is deterministic and side-effect free: no wall-clock reads,
   no randomness, no timers. The caller passes in the current time (`now`) and
   the running usage counters, so every decision is fully reproducible. */

export type TaskKind = 'solve' | 'assist' | 'translation' | 'summary' | 'proactive'

export interface BudgetLimits {
  /** Max AI requests allowed this session (undefined = unlimited). */
  maxRequests?: number
  /** Max total tokens allowed this session (undefined = unlimited). */
  maxTokens?: number
  /** Max total spend in USD allowed this session (undefined = unlimited). */
  maxCostUsd?: number
  /** Minimum gap between translation calls, in ms (undefined = no throttle). */
  minTranslationIntervalMs?: number
  /** Minimum gap between summary calls, in ms (undefined = no throttle). */
  minSummaryIntervalMs?: number
  /** Minimum gap between proactive calls, in ms (undefined = no throttle). */
  minProactiveIntervalMs?: number
  /** Ordered priority; earlier entries are protected longer under pressure. */
  priority: TaskKind[]
}

export interface BudgetUsage {
  requests: number
  tokens: number
  costUsd: number
  /** Timestamp (ms) of the last run of each task, for frequency throttling. */
  lastAt: Partial<Record<TaskKind, number>>
}

export interface RecordUsageDelta {
  requests?: number
  tokens?: number
  costUsd?: number
  /** When both task and now are given, records lastAt[task] = now. */
  task?: TaskKind
  now?: number
}

export interface OverBudget {
  requests: boolean
  tokens: boolean
  cost: boolean
  any: boolean
}

export type DenyReason = 'over-budget' | 'too-frequent' | 'deprioritized'

export interface AllowResult {
  allow: boolean
  reason?: DenyReason
}

/** A fresh usage snapshot: all counters zero, no recorded task times. */
export function createUsage(): BudgetUsage {
  return { requests: 0, tokens: 0, costUsd: 0, lastAt: {} }
}

/** Pure increment: returns a NEW usage with the deltas added; the input is never
   mutated. When both `task` and `now` are provided, lastAt[task] is set to now
   (used later by frequency throttling). Missing deltas default to zero. */
export function recordUsage(usage: BudgetUsage, delta: RecordUsageDelta): BudgetUsage {
  const lastAt = { ...usage.lastAt }
  if (delta.task !== undefined && delta.now !== undefined) {
    lastAt[delta.task] = delta.now
  }
  return {
    requests: usage.requests + (delta.requests ?? 0),
    tokens: usage.tokens + (delta.tokens ?? 0),
    costUsd: usage.costUsd + (delta.costUsd ?? 0),
    lastAt
  }
}

/** Which budget dimensions are exhausted. A dimension is flagged only when its
   max is DEFINED and the counter has reached or exceeded it; an undefined max
   means "unlimited" and never flags. `any` is true when at least one dimension
   is over. */
export function isOverBudget(usage: BudgetUsage, limits: BudgetLimits): OverBudget {
  const requests = limits.maxRequests !== undefined && usage.requests >= limits.maxRequests
  const tokens = limits.maxTokens !== undefined && usage.tokens >= limits.maxTokens
  const cost = limits.maxCostUsd !== undefined && usage.costUsd >= limits.maxCostUsd
  return { requests, tokens, cost, any: requests || tokens || cost }
}

/** The configured minimum interval (ms) for a throttled task, or undefined when
   the task is not frequency-throttled. Only translation/summary/proactive have
   intervals; solve/assist always return undefined. */
export function minIntervalFor(task: TaskKind, limits: BudgetLimits): number | undefined {
  switch (task) {
    case 'translation':
      return limits.minTranslationIntervalMs
    case 'summary':
      return limits.minSummaryIntervalMs
    case 'proactive':
      return limits.minProactiveIntervalMs
    default:
      return undefined
  }
}

/** Whether enough time has elapsed to run a frequency-throttled task. True when
   the task has no configured interval, or has never run, or `now - lastAt` is at
   least the interval. Tasks without an interval always pass. */
export function canRunFrequency(
  usage: BudgetUsage,
  task: TaskKind,
  limits: BudgetLimits,
  now: number
): boolean {
  const interval = minIntervalFor(task, limits)
  if (interval === undefined) return true
  const last = usage.lastAt[task]
  if (last === undefined) return true
  return now - last >= interval
}

/** Decide whether a task may run right now.

   'solve' is the core answer and is ALWAYS allowed, even when the session is
   over budget — the spec forbids abruptly killing the core answer, so budget
   pressure degrades the background tasks (assist/translation/summary/proactive)
   instead. For every other task: deny 'over-budget' when any budget dimension is
   exhausted, then deny 'too-frequent' when its min interval has not elapsed,
   otherwise allow. */
export function allowTask(
  usage: BudgetUsage,
  task: TaskKind,
  limits: BudgetLimits,
  now: number
): AllowResult {
  if (task === 'solve') return { allow: true }
  if (isOverBudget(usage, limits).any) return { allow: false, reason: 'over-budget' }
  if (!canRunFrequency(usage, task, limits, now)) {
    return { allow: false, reason: 'too-frequent' }
  }
  return { allow: true }
}

/** The order in which tasks get shed under pressure: the REVERSE of the priority
   list, so the lowest-priority task is dropped first and the most-protected task
   last. 'solve' is the core answer and is never shed, so it is excluded from the
   plan regardless of where it sits in the priority list. */
export function degradePlan(limits: BudgetLimits): TaskKind[] {
  return [...limits.priority].reverse().filter((task) => task !== 'solve')
}
