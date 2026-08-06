/** Per-question-type answer scaffolds (P1#27 / P2#43).

   Given a classified QuestionType (from question-type.ts), return the ordered
   checklist of things a strong answer covers for that kind of question — the
   "workbench" scaffold the UI shows so the candidate hits every beat instead of
   rambling. Deterministic and content-only: no IO, no clock, no randomness.

   The scaffold is intentionally interview-generic (works for any coding / system
   design / sql / behavioral / debugging prompt); type-specific wording lives in
   i18n, keyed by the returned step ids, so this module stays language-neutral. */

import type { QuestionType } from './question-type'

/** One step of a scaffold. `id` keys the i18n label; `optional` steps are shown
   dimmed / skippable so the checklist doesn't over-constrain a short answer. */
export interface ScaffoldStep {
  id: string
  optional?: boolean
}

// Ordered scaffolds per answerable type. Ids are stable and namespaced by type
// so i18n keys never collide (e.g. `scaffold.coding.clarify`).
const SCAFFOLDS: Record<Exclude<QuestionType, 'unknown'>, ScaffoldStep[]> = {
  coding: [
    { id: 'coding.clarify' },
    { id: 'coding.examples' },
    { id: 'coding.brute-force' },
    { id: 'coding.optimize' },
    { id: 'coding.complexity' },
    { id: 'coding.code' },
    { id: 'coding.tests' }
  ],
  'system-design': [
    { id: 'system-design.requirements' },
    { id: 'system-design.scale' },
    { id: 'system-design.api' },
    { id: 'system-design.high-level' },
    { id: 'system-design.data-model' },
    { id: 'system-design.bottlenecks' },
    { id: 'system-design.tradeoffs' }
  ],
  sql: [
    { id: 'sql.schema' },
    { id: 'sql.target-columns' },
    { id: 'sql.joins' },
    { id: 'sql.filter-aggregate' },
    { id: 'sql.edge-cases' },
    { id: 'sql.verify', optional: true }
  ],
  behavioral: [
    { id: 'behavioral.situation' },
    { id: 'behavioral.task' },
    { id: 'behavioral.action' },
    { id: 'behavioral.result' },
    { id: 'behavioral.reflection', optional: true }
  ],
  debugging: [
    { id: 'debugging.reproduce' },
    { id: 'debugging.narrow' },
    { id: 'debugging.hypothesis' },
    { id: 'debugging.verify' },
    { id: 'debugging.fix' },
    { id: 'debugging.prevent', optional: true }
  ]
}

/** The scaffold steps for a question type, in the order a strong answer covers
   them. 'unknown' has no scaffold (the caller falls back to the general flow),
   so this returns []. Never mutates the shared definition — returns a copy. */
export function scaffoldFor(type: QuestionType): ScaffoldStep[] {
  if (type === 'unknown') return []
  return SCAFFOLDS[type].map((step) => ({ ...step }))
}

/** Whether a question type has a scaffold to show. */
export function hasScaffold(type: QuestionType): boolean {
  return type !== 'unknown' && SCAFFOLDS[type].length > 0
}
