/** Pure control-surface partition for the overlay / control-center split (P1#31).

   The header crams every action into one always-visible row. During a live
   interview a smaller visible footprint is better (less to notice on a shared
   screen), so controls split into two surfaces:

   - **overlay**: always visible in the header — the live-critical / high-
     frequency actions (mic, new conversation, export when there's something to
     export).
   - **center**: folded into a "control center" overflow — the setup / between-
     session tools (mock, brief, self-check, settings, help).

   This module is the deterministic classifier: given the control inventory and
   the current context (is there a conversation? is mac?), it returns the ordered
   ids for each surface. Pure: no IO, no clock, no randomness, no JSX. Labels /
   icons / handlers stay in the component, keyed by id.

   Keeping the partition here (not inline in the header) makes it unit-testable
   and keeps the two surfaces from drifting out of sync. */

export type ControlSurface = 'overlay' | 'center'

/** Every actionable control in the header, by stable id. */
export type ControlId =
  | 'transcription'
  | 'export'
  | 'new-conversation'
  | 'history'
  | 'mock'
  | 'brief'
  | 'self-check'
  | 'settings'
  | 'help'
  | 'close'

interface ControlDef {
  id: ControlId
  surface: ControlSurface
  /** Only shown when there's an active conversation (e.g. export). */
  needsConversation?: boolean
  /** Only shown off macOS (the custom window-close button). */
  nonMacOnly?: boolean
}

// Declaration order is display order within each surface.
const CONTROLS: ControlDef[] = [
  { id: 'transcription', surface: 'overlay' },
  { id: 'export', surface: 'overlay', needsConversation: true },
  { id: 'new-conversation', surface: 'overlay' },
  { id: 'history', surface: 'overlay' },
  { id: 'mock', surface: 'center' },
  { id: 'brief', surface: 'center' },
  { id: 'self-check', surface: 'center' },
  { id: 'settings', surface: 'center' },
  { id: 'help', surface: 'center' },
  { id: 'close', surface: 'overlay', nonMacOnly: true }
]

export interface ControlContext {
  hasConversation: boolean
  isMac: boolean
}

function isVisible(def: ControlDef, ctx: ControlContext): boolean {
  if (def.needsConversation && !ctx.hasConversation) return false
  if (def.nonMacOnly && ctx.isMac) return false
  return true
}

/** The ordered, context-filtered control ids for one surface. */
export function controlsForSurface(surface: ControlSurface, ctx: ControlContext): ControlId[] {
  return CONTROLS.filter((def) => def.surface === surface && isVisible(def, ctx)).map(
    (def) => def.id
  )
}

/** The surface a given control belongs to (its declared home), ignoring
   context. Useful for asserting a control is never in both surfaces. */
export function surfaceOf(id: ControlId): ControlSurface {
  const def = CONTROLS.find((c) => c.id === id)
  if (!def) throw new Error(`unknown control id: ${id}`)
  return def.surface
}

/** Whether the control center has any controls to show in this context (so the
   header can hide the overflow trigger entirely when it would be empty). */
export function hasControlCenter(ctx: ControlContext): boolean {
  return controlsForSurface('center', ctx).length > 0
}
