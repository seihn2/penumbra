/** Pure window-placement math for spatial presets (P1#32) and safe clamping.

   The stateful window controller (Electron BrowserWindow) calls into these
   helpers; keeping the geometry pure means the "snap to a corner / half /
   center" math and the "never push the window fully off-screen" clamp are both
   unit-testable without a real display.

   Pure: no IO, no Date.now/Math.random; every function returns a fresh Rect. */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** A display's usable area (excludes the OS menu bar / taskbar). */
export interface WorkArea {
  x: number
  y: number
  width: number
  height: number
}

export type SpatialPreset =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-half'
  | 'right-half'

/** Keep at least this many px of the window on-screen so it can't be lost. */
export const VISIBLE_MARGIN = 80

/** Clamp a position so at least VISIBLE_MARGIN px of the window stays within the
   work area on every edge. Returns a fresh Rect; never mutates the input. A
   window larger than the area is pinned to the area's top-left corner region
   rather than flipping (min/max stay ordered). */
export function clampToWorkArea(rect: Rect, area: WorkArea, margin = VISIBLE_MARGIN): Rect {
  const minX = area.x - rect.width + margin
  const maxX = area.x + area.width - margin
  const minY = area.y - rect.height + margin
  const maxY = area.y + area.height - margin
  return {
    x: Math.round(Math.min(Math.max(rect.x, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(rect.y, minY), Math.max(minY, maxY))),
    width: rect.width,
    height: rect.height
  }
}

/** Compute the window rect for a named spatial preset within a work area,
   preserving the window's current size (except halves, which take half the
   area width and the full area height). The result is clamped so it never
   lands off-screen. Pure. */
export function presetRect(
  preset: SpatialPreset,
  size: { width: number; height: number },
  area: WorkArea
): Rect {
  const { width, height } = size
  const right = area.x + area.width - width
  const bottom = area.y + area.height - height
  const centerX = area.x + Math.round((area.width - width) / 2)
  const centerY = area.y + Math.round((area.height - height) / 2)
  const halfWidth = Math.round(area.width / 2)

  let rect: Rect
  switch (preset) {
    case 'center':
      rect = { x: centerX, y: centerY, width, height }
      break
    case 'top-left':
      rect = { x: area.x, y: area.y, width, height }
      break
    case 'top-right':
      rect = { x: right, y: area.y, width, height }
      break
    case 'bottom-left':
      rect = { x: area.x, y: bottom, width, height }
      break
    case 'bottom-right':
      rect = { x: right, y: bottom, width, height }
      break
    case 'left-half':
      rect = { x: area.x, y: area.y, width: halfWidth, height: area.height }
      break
    case 'right-half':
      rect = {
        x: area.x + halfWidth,
        y: area.y,
        width: area.width - halfWidth,
        height: area.height
      }
      break
  }
  return clampToWorkArea(rect, area)
}

/** How much of `rect` overlaps `area`, in px². Zero when they don't intersect.
   Used by hot-plug reconciliation to decide which surviving display the window
   is "mostly on" and whether it's stranded. Pure. */
export function overlapArea(rect: Rect, area: WorkArea): number {
  const left = Math.max(rect.x, area.x)
  const right = Math.min(rect.x + rect.width, area.x + area.width)
  const top = Math.max(rect.y, area.y)
  const bottom = Math.min(rect.y + rect.height, area.y + area.height)
  const w = right - left
  const h = bottom - top
  return w > 0 && h > 0 ? w * h : 0
}

/** The result of reconciling a window against the current display set. */
export interface ReconcileResult {
  /** The rect the window should occupy after reconciliation. */
  rect: Rect
  /** True when the window was moved because its display changed/vanished. */
  moved: boolean
}

/** Reconcile a window's rect against the current set of display work areas
   (call this on a display add/remove/metrics-change).

   - If the window still keeps at least `minVisible` px² of itself on some
     display, it's left where it is (moved:false) — a benign layout change.
   - Otherwise it's stranded (its home display was unplugged, or it ended up in
     a gap): it's re-centered on the display with which it currently has the
     most overlap, or — if it overlaps none — the first display in the list
     (treated as primary). The chosen rect is clamped to that display.

   `areas` must be non-empty (there is always at least one display). Pure: no
   IO, no screen access; the caller passes the work areas in. */
export function reconcileWindowToDisplays(
  rect: Rect,
  areas: WorkArea[],
  minVisible = VISIBLE_MARGIN * VISIBLE_MARGIN
): ReconcileResult {
  if (areas.length === 0) return { rect, moved: false }

  let bestArea = areas[0]
  let bestOverlap = 0
  for (const area of areas) {
    const overlap = overlapArea(rect, area)
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestArea = area
    }
  }

  // Enough of the window is still visible somewhere → leave it in place.
  if (bestOverlap >= minVisible) return { rect, moved: false }

  // Stranded: re-center on the best (or primary) surviving display.
  const target = presetRect('center', { width: rect.width, height: rect.height }, bestArea)
  return { rect: target, moved: true }
}
