import { describe, expect, it } from 'vitest'
import {
  createRegistry,
  hashImage,
  markSent,
  markSummarized,
  markSuperseded,
  needsReattach,
  pin,
  registerAsset,
  selectForSend,
  unpin
} from '../src/shared/asset-ref'

// A tiny fake "base64" — the module only hashes the string, never decodes it.
const IMG_A = 'AAAA-base64-alpha'
const IMG_B = 'BBBB-base64-beta'
const IMG_C = 'CCCC-base64-gamma'

/** Register a fresh image and return the updated registry + new ref id. */
function add(registry: ReturnType<typeof createRegistry>, base64: string, now: number) {
  const result = registerAsset(registry, { base64, now })
  return { registry: result.registry, id: result.ref.id }
}

describe('hashImage', () => {
  it('is deterministic — identical base64 hashes equal', () => {
    expect(hashImage(IMG_A)).toBe(hashImage(IMG_A))
  })

  it('produces different hashes for different base64', () => {
    expect(hashImage(IMG_A)).not.toBe(hashImage(IMG_B))
  })

  it('hashes the empty string without throwing', () => {
    expect(typeof hashImage('')).toBe('string')
  })
})

describe('registerAsset', () => {
  it('adds a fresh image as a sent ref', () => {
    const { registry, ref } = registerAsset(createRegistry(), { base64: IMG_A, now: 1 })
    expect(ref.state).toBe('sent')
    expect(ref.pinned).toBe(false)
    expect(ref.createdAt).toBe(1)
    expect(registry.refs).toHaveLength(1)
  })

  it('assigns deterministic sequential ids (no random / time ids)', () => {
    const r1 = registerAsset(createRegistry(), { base64: IMG_A, now: 1 })
    const r2 = registerAsset(r1.registry, { base64: IMG_B, now: 2 })
    expect(r1.ref.id).toBe('asset-1')
    expect(r2.ref.id).toBe('asset-2')
  })

  it('marks a duplicate capture as duplicate-unsent (dedup, no 2nd sendable)', () => {
    const first = registerAsset(createRegistry(), { base64: IMG_A, now: 1 })
    const second = registerAsset(first.registry, { base64: IMG_A, now: 2 })
    expect(second.ref.state).toBe('duplicate-unsent')
    // Two refs recorded (audit trail) but only one distinct sendable image.
    expect(second.registry.refs).toHaveLength(2)
    expect(selectForSend(second.registry)).toHaveLength(1)
  })

  it('does not treat a re-capture of a superseded hash as a duplicate', () => {
    const first = add(createRegistry(), IMG_A, 1)
    const superseded = markSuperseded(first.registry, first.id)
    const again = registerAsset(superseded, { base64: IMG_A, now: 2 })
    expect(again.ref.state).toBe('sent')
  })

  it('does not mutate the input registry', () => {
    const registry = createRegistry()
    registerAsset(registry, { base64: IMG_A, now: 1 })
    expect(registry.refs).toHaveLength(0)
    expect(registry.seq).toBe(0)
  })
})

describe('state transitions are pure', () => {
  it('markSent / markSummarized / markSuperseded return new registries', () => {
    const { registry, id } = add(createRegistry(), IMG_A, 1)
    const summarized = markSummarized(registry, id)
    expect(summarized).not.toBe(registry)
    expect(registry.refs[0].state).toBe('sent')
    expect(summarized.refs[0].state).toBe('summarized')
    expect(markSuperseded(registry, id).refs[0].state).toBe('superseded')
    expect(markSent(summarized, id).refs[0].state).toBe('sent')
  })

  it('pin / unpin toggle state and pinned flag purely', () => {
    const { registry, id } = add(createRegistry(), IMG_A, 1)
    const pinned = pin(registry, id)
    expect(pinned.refs[0].pinned).toBe(true)
    expect(pinned.refs[0].state).toBe('pinned')
    expect(registry.refs[0].pinned).toBe(false)

    const unpinned = unpin(pinned, id)
    expect(unpinned.refs[0].pinned).toBe(false)
    expect(unpinned.refs[0].state).toBe('sent')
  })

  it('leaves unmatched refs and seq untouched', () => {
    const a = add(createRegistry(), IMG_A, 1)
    const b = add(a.registry, IMG_B, 2)
    const updated = markSuperseded(b.registry, a.id)
    expect(updated.seq).toBe(2)
    expect(updated.refs[1].state).toBe('sent')
  })
})

describe('selectForSend', () => {
  it('returns the most-recent sendable refs', () => {
    const a = add(createRegistry(), IMG_A, 1)
    const b = add(a.registry, IMG_B, 2)
    const selected = selectForSend(b.registry)
    expect(selected.map((r) => r.hash)).toEqual([hashImage(IMG_B), hashImage(IMG_A)])
  })

  it('caps at maxImages (default 5)', () => {
    let registry = createRegistry()
    for (let i = 0; i < 8; i++) {
      registry = add(registry, `img-${i}`, i).registry
    }
    expect(selectForSend(registry)).toHaveLength(5)
    expect(selectForSend(registry, 3)).toHaveLength(3)
  })

  it('always includes pinned assets first', () => {
    const a = add(createRegistry(), IMG_A, 1)
    const b = add(a.registry, IMG_B, 2)
    const c = add(b.registry, IMG_C, 3)
    // Pin the OLDEST asset; it must still lead the selection.
    const pinned = pin(c.registry, a.id)
    const selected = selectForSend(pinned)
    expect(selected[0].hash).toBe(hashImage(IMG_A))
    expect(selected).toHaveLength(3)
  })

  it('never exceeds maxImages even with many pinned assets', () => {
    let registry = createRegistry()
    const ids: string[] = []
    for (let i = 0; i < 8; i++) {
      const r = add(registry, `img-${i}`, i)
      registry = r.registry
      ids.push(r.id)
    }
    for (const id of ids) registry = pin(registry, id)
    expect(selectForSend(registry, 4)).toHaveLength(4)
  })

  it('excludes superseded and summarized assets', () => {
    const a = add(createRegistry(), IMG_A, 1)
    const b = add(a.registry, IMG_B, 2)
    const c = add(b.registry, IMG_C, 3)
    let registry = markSuperseded(c.registry, a.id)
    registry = markSummarized(registry, b.id)
    const selected = selectForSend(registry)
    expect(selected.map((r) => r.hash)).toEqual([hashImage(IMG_C)])
  })

  it('excludes duplicate-unsent refs (no duplicate pixels)', () => {
    const first = add(createRegistry(), IMG_A, 1)
    const dup = registerAsset(first.registry, { base64: IMG_A, now: 2 })
    expect(selectForSend(dup.registry)).toHaveLength(1)
  })
})

describe('needsReattach', () => {
  it('is true for an empty registry', () => {
    expect(needsReattach(createRegistry())).toBe(true)
  })

  it('is false while a sendable image exists', () => {
    const { registry } = add(createRegistry(), IMG_A, 1)
    expect(needsReattach(registry)).toBe(false)
  })

  it('is true when everything is superseded/summarized', () => {
    const a = add(createRegistry(), IMG_A, 1)
    const b = add(a.registry, IMG_B, 2)
    let registry = markSuperseded(b.registry, a.id)
    registry = markSummarized(registry, b.id)
    expect(needsReattach(registry)).toBe(true)
  })

  it('stays false when a pinned asset survives supersession of others', () => {
    const a = add(createRegistry(), IMG_A, 1)
    const b = add(a.registry, IMG_B, 2)
    let registry = pin(b.registry, a.id)
    registry = markSuperseded(registry, b.id)
    expect(needsReattach(registry)).toBe(false)
  })
})
