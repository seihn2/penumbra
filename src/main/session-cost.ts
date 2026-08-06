import { ipcMain } from 'electron'
import { createUsage, recordUsage, type BudgetUsage, type TaskKind } from '../shared/cost-budget'

/** Main-process per-session cost/usage tracker (P1#35 groundwork). Accumulates
   request count and approximate token usage per AI task via the tested
   cost-budget helpers, and exposes it to the renderer so the user can see how
   much a session is consuming. Reset when a new session starts. */
let usage: BudgetUsage = createUsage()

/** Record one AI request. `approxTokens` is a rough estimate (e.g. chars/4). */
export function recordCost(task: TaskKind, approxTokens: number, now: number): void {
  usage = recordUsage(usage, {
    requests: 1,
    tokens: Math.max(0, Math.round(approxTokens)),
    task,
    now
  })
}

export function resetSessionCost(): void {
  usage = createUsage()
}

export function getSessionCost(): BudgetUsage {
  return usage
}

ipcMain.handle('get-session-cost', () => usage)
