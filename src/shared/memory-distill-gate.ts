/** Decide whether to run a memory-distillation pass on this finalized turn.

   Pure so the gating is testable in isolation. Distillation is opt-in
   (feature flag), needs an API key to call the model, only runs once the
   configured number of new turns has accrued since the last pass, and needs
   some conversation to distill from. */
export interface DistillGateInput {
  enabled: boolean
  hasApiKey: boolean
  finalizedTurnCount: number
  lastDistillAtTurn: number
  intervalTurns: number
  recentTurnCount: number
}

export function shouldDistillMemory(input: DistillGateInput): boolean {
  if (!input.enabled) return false
  if (!input.hasApiKey) return false
  if (input.recentTurnCount === 0) return false
  if (input.intervalTurns <= 0) return false
  return input.finalizedTurnCount - input.lastDistillAtTurn >= input.intervalTurns
}
