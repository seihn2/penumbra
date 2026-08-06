/** Decide whether a proactive "vibe" assist should run on this tick.

   Pure so the gating (feature flag, no overlap with an in-flight assist, only
   when new conversation has accrued, and there's something to react to) is
   testable in isolation. */
export interface ProactiveGateInput {
  enabled: boolean
  hasApiKey: boolean
  assistInFlight: boolean
  finalizedTurnCount: number
  turnCountAtLastProactive: number
  recentTurnCount: number
}

export function shouldRunProactiveAssist(input: ProactiveGateInput): boolean {
  if (!input.enabled) return false
  if (!input.hasApiKey) return false
  if (input.assistInFlight) return false
  if (input.finalizedTurnCount <= input.turnCountAtLastProactive) return false
  if (input.recentTurnCount === 0) return false
  return true
}
