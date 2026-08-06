import { describe, expect, it } from 'vitest'
import {
  coalesce,
  DEGRADE_LADDER,
  isCodeBlockClosed,
  nextDegradation,
  shouldFlushFrame,
  shouldHighlight,
  shouldPersist,
  shouldUpdateDiagnostics,
  visibleWindow
} from '../src/shared/stream-throttle'

describe('shouldFlushFrame', () => {
  it('is false just before the 40ms frame boundary', () => {
    expect(shouldFlushFrame(1000, 1039)).toBe(false)
  })

  it('is true exactly at the 40ms frame boundary', () => {
    expect(shouldFlushFrame(1000, 1040)).toBe(true)
  })

  it('is true well past the boundary', () => {
    expect(shouldFlushFrame(1000, 2000)).toBe(true)
  })

  it('respects a custom frame budget', () => {
    expect(shouldFlushFrame(0, 31, 32)).toBe(false)
    expect(shouldFlushFrame(0, 32, 32)).toBe(true)
  })
})

describe('coalesce', () => {
  it('concatenates incoming tokens onto the buffer', () => {
    expect(coalesce('foo', 'bar')).toBe('foobar')
  })

  it('is a no-op when incoming is empty', () => {
    expect(coalesce('foo', '')).toBe('foo')
  })
})

describe('shouldPersist', () => {
  it('is true at turn end regardless of elapsed time', () => {
    expect(shouldPersist(1000, 1000, true)).toBe(true)
    expect(shouldPersist(1000, 1001, true)).toBe(true)
  })

  it('is true once >=2s has elapsed', () => {
    expect(shouldPersist(0, 2000, false)).toBe(true)
  })

  it('is false before 2s with no turn end', () => {
    expect(shouldPersist(0, 1999, false)).toBe(false)
  })

  it('respects a custom interval', () => {
    expect(shouldPersist(0, 4999, false, 5000)).toBe(false)
    expect(shouldPersist(0, 5000, false, 5000)).toBe(true)
  })
})

describe('shouldUpdateDiagnostics', () => {
  it('is false just before the 250ms (4/s) budget', () => {
    expect(shouldUpdateDiagnostics(1000, 1249)).toBe(false)
  })

  it('is true exactly at the 250ms budget', () => {
    expect(shouldUpdateDiagnostics(1000, 1250)).toBe(true)
  })

  it('respects a custom rate cap', () => {
    // 10/s => one update every 100ms
    expect(shouldUpdateDiagnostics(0, 99, 10)).toBe(false)
    expect(shouldUpdateDiagnostics(0, 100, 10)).toBe(true)
  })
})

describe('isCodeBlockClosed / shouldHighlight', () => {
  it('treats zero fences as closed', () => {
    expect(isCodeBlockClosed('just prose, no code')).toBe(true)
    expect(shouldHighlight('just prose, no code')).toBe(true)
  })

  it('treats a matched pair of fences as closed', () => {
    const md = '```ts\nconst x = 1\n```'
    expect(isCodeBlockClosed(md)).toBe(true)
    expect(shouldHighlight(md)).toBe(true)
  })

  it('treats a single open fence as not closed', () => {
    const md = '```ts\nconst x = 1'
    expect(isCodeBlockClosed(md)).toBe(false)
    expect(shouldHighlight(md)).toBe(false)
  })

  it('treats three fences (one still open) as not closed', () => {
    const md = '```ts\na\n```\ntext\n```js\nb'
    expect(isCodeBlockClosed(md)).toBe(false)
    expect(shouldHighlight(md)).toBe(false)
  })
})

describe('visibleWindow', () => {
  it('returns all items when fewer than the cap', () => {
    expect(visibleWindow([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('caps to the last 60 items, preserving order', () => {
    const items = Array.from({ length: 100 }, (_, i) => i)
    const windowed = visibleWindow(items)
    expect(windowed).toHaveLength(60)
    expect(windowed[0]).toBe(40)
    expect(windowed[windowed.length - 1]).toBe(99)
  })

  it('respects a custom row cap', () => {
    expect(visibleWindow([1, 2, 3, 4, 5], 2)).toEqual([4, 5])
  })
})

describe('nextDegradation', () => {
  it('walks the full ladder in order and stops at the end', () => {
    expect(nextDegradation('full')).toBe('no-animations')
    expect(nextDegradation('no-animations')).toBe('no-highlight')
    expect(nextDegradation('no-highlight')).toBe('no-thumbnails')
    expect(nextDegradation('no-thumbnails')).toBe(null)
  })

  it('exposes the ladder without audio or answer text', () => {
    expect(DEGRADE_LADDER).toEqual(['full', 'no-animations', 'no-highlight', 'no-thumbnails'])
    expect(DEGRADE_LADDER).not.toContain('no-audio')
    expect(DEGRADE_LADDER).not.toContain('no-answer')
  })
})

describe('purity / determinism', () => {
  it('returns identical results for identical inputs (no hidden clock)', () => {
    expect(shouldFlushFrame(100, 200)).toBe(shouldFlushFrame(100, 200))
    expect(shouldPersist(0, 500, false)).toBe(shouldPersist(0, 500, false))
    expect(visibleWindow([1, 2, 3], 2)).toEqual(visibleWindow([1, 2, 3], 2))
  })
})
