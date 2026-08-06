import { describe, expect, it } from 'vitest'
import {
  VISIBLE_MARGIN,
  clampToWorkArea,
  overlapArea,
  presetRect,
  reconcileWindowToDisplays,
  type Rect,
  type WorkArea
} from '../src/shared/spatial-presets'

const AREA: WorkArea = { x: 0, y: 0, width: 1000, height: 800 }
const SIZE = { width: 200, height: 100 }

describe('clampToWorkArea', () => {
  it('leaves an in-bounds rect unchanged', () => {
    const rect: Rect = { x: 100, y: 100, ...SIZE }
    expect(clampToWorkArea(rect, AREA)).toEqual(rect)
  })

  it('keeps the margin visible when pushed off the right/bottom', () => {
    const rect: Rect = { x: 5000, y: 5000, ...SIZE }
    const out = clampToWorkArea(rect, AREA)
    expect(out.x).toBe(AREA.width - VISIBLE_MARGIN)
    expect(out.y).toBe(AREA.height - VISIBLE_MARGIN)
  })

  it('keeps the margin visible when pushed off the top/left', () => {
    const rect: Rect = { x: -5000, y: -5000, ...SIZE }
    const out = clampToWorkArea(rect, AREA)
    expect(out.x).toBe(AREA.x - SIZE.width + VISIBLE_MARGIN)
    expect(out.y).toBe(AREA.y - SIZE.height + VISIBLE_MARGIN)
  })

  it('respects a non-zero area origin (secondary display)', () => {
    const area: WorkArea = { x: 2000, y: -100, width: 1000, height: 800 }
    const out = clampToWorkArea({ x: -9999, y: -9999, ...SIZE }, area)
    expect(out.x).toBe(area.x - SIZE.width + VISIBLE_MARGIN)
    expect(out.y).toBe(area.y - SIZE.height + VISIBLE_MARGIN)
  })

  it('does not mutate the input rect', () => {
    const rect: Rect = { x: 5000, y: 5000, ...SIZE }
    const snapshot = { ...rect }
    clampToWorkArea(rect, AREA)
    expect(rect).toEqual(snapshot)
  })
})

describe('presetRect', () => {
  it('centers within the work area', () => {
    const r = presetRect('center', SIZE, AREA)
    expect(r).toEqual({ x: 400, y: 350, width: 200, height: 100 })
  })

  it('snaps to each corner', () => {
    expect(presetRect('top-left', SIZE, AREA)).toMatchObject({ x: 0, y: 0 })
    expect(presetRect('top-right', SIZE, AREA)).toMatchObject({ x: 800, y: 0 })
    expect(presetRect('bottom-left', SIZE, AREA)).toMatchObject({ x: 0, y: 700 })
    expect(presetRect('bottom-right', SIZE, AREA)).toMatchObject({ x: 800, y: 700 })
  })

  it('tiles the left and right halves to full height', () => {
    const left = presetRect('left-half', SIZE, AREA)
    const right = presetRect('right-half', SIZE, AREA)
    expect(left).toEqual({ x: 0, y: 0, width: 500, height: 800 })
    expect(right).toEqual({ x: 500, y: 0, width: 500, height: 800 })
  })

  it('offsets corners by a secondary display origin', () => {
    const area: WorkArea = { x: 2000, y: 0, width: 1000, height: 800 }
    expect(presetRect('top-left', SIZE, area)).toMatchObject({ x: 2000, y: 0 })
    expect(presetRect('top-right', SIZE, area)).toMatchObject({ x: 2800, y: 0 })
  })

  it('is deterministic', () => {
    expect(presetRect('center', SIZE, AREA)).toEqual(presetRect('center', SIZE, AREA))
  })
})

describe('overlapArea', () => {
  it('is the intersection area when the rects overlap', () => {
    const rect: Rect = { x: 50, y: 50, width: 100, height: 100 }
    const area: WorkArea = { x: 0, y: 0, width: 100, height: 100 }
    // overlap is x:[50,100] y:[50,100] = 50 * 50
    expect(overlapArea(rect, area)).toBe(2500)
  })

  it('is zero when they do not intersect', () => {
    const rect: Rect = { x: 500, y: 500, width: 100, height: 100 }
    const area: WorkArea = { x: 0, y: 0, width: 100, height: 100 }
    expect(overlapArea(rect, area)).toBe(0)
  })
})

describe('reconcileWindowToDisplays', () => {
  const PRIMARY: WorkArea = { x: 0, y: 0, width: 1000, height: 800 }
  const SECONDARY: WorkArea = { x: 1000, y: 0, width: 1000, height: 800 }

  it('leaves a window that is still mostly visible in place', () => {
    const rect: Rect = { x: 100, y: 100, width: 400, height: 300 }
    const result = reconcileWindowToDisplays(rect, [PRIMARY, SECONDARY])
    expect(result.moved).toBe(false)
    expect(result.rect).toBe(rect)
  })

  it('re-centers a window stranded when its display is unplugged', () => {
    // Window lived on the secondary display, which is now gone.
    const rect: Rect = { x: 1200, y: 200, width: 400, height: 300 }
    const result = reconcileWindowToDisplays(rect, [PRIMARY])
    expect(result.moved).toBe(true)
    // Centered on the surviving primary display.
    expect(result.rect).toEqual(presetRect('center', { width: 400, height: 300 }, PRIMARY))
  })

  it('moves to the display with the most overlap when barely stranded', () => {
    // Only a sliver on primary (below minVisible), rest in the dead gap.
    const rect: Rect = { x: -390, y: 200, width: 400, height: 300 }
    const result = reconcileWindowToDisplays(rect, [PRIMARY], 80 * 80)
    expect(result.moved).toBe(true)
    expect(result.rect).toEqual(presetRect('center', { width: 400, height: 300 }, PRIMARY))
  })

  it('falls back to the first display when the window overlaps none', () => {
    const rect: Rect = { x: 5000, y: 5000, width: 400, height: 300 }
    const result = reconcileWindowToDisplays(rect, [PRIMARY, SECONDARY])
    expect(result.moved).toBe(true)
    expect(result.rect).toEqual(presetRect('center', { width: 400, height: 300 }, PRIMARY))
  })

  it('no-ops on an empty display list rather than throwing', () => {
    const rect: Rect = { x: 0, y: 0, width: 400, height: 300 }
    expect(reconcileWindowToDisplays(rect, [])).toEqual({ rect, moved: false })
  })

  it('is deterministic', () => {
    const rect: Rect = { x: 1200, y: 200, width: 400, height: 300 }
    expect(reconcileWindowToDisplays(rect, [PRIMARY])).toEqual(
      reconcileWindowToDisplays(rect, [PRIMARY])
    )
  })
})
