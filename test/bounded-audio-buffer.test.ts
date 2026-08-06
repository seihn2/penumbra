import { describe, expect, it } from 'vitest'
import { BoundedAudioBuffer } from '../src/main/asr/bounded-audio-buffer'

const chunk = (bytes: number): Buffer => Buffer.alloc(bytes)

describe('BoundedAudioBuffer', () => {
  it('accumulates chunks and reports size/byteLength', () => {
    const buf = new BoundedAudioBuffer(1000)
    buf.push(chunk(100))
    buf.push(chunk(200))
    expect(buf.size).toBe(2)
    expect(buf.byteLength).toBe(300)
  })

  it('drains all chunks and resets to empty', () => {
    const buf = new BoundedAudioBuffer(1000)
    buf.push(chunk(100))
    buf.push(chunk(200))
    const drained = buf.drain()
    expect(drained.length).toBe(2)
    expect(buf.size).toBe(0)
    expect(buf.byteLength).toBe(0)
  })

  it('drops the oldest chunks when exceeding the cap', () => {
    const buf = new BoundedAudioBuffer(250)
    buf.push(chunk(100)) // [100]
    buf.push(chunk(100)) // [100,100] = 200
    buf.push(chunk(100)) // 300 > 250 → drop oldest → [100,100] = 200
    expect(buf.size).toBe(2)
    expect(buf.byteLength).toBe(200)
  })

  it('keeps dropping until under the cap for a large chunk', () => {
    const buf = new BoundedAudioBuffer(250)
    buf.push(chunk(100))
    buf.push(chunk(100))
    buf.push(chunk(240)) // must drop both prior to fit under 250
    expect(buf.size).toBe(1)
    expect(buf.byteLength).toBe(240)
  })

  it('clear() empties without returning chunks', () => {
    const buf = new BoundedAudioBuffer(1000)
    buf.push(chunk(100))
    buf.clear()
    expect(buf.size).toBe(0)
    expect(buf.byteLength).toBe(0)
  })

  it('drops even a single chunk that alone exceeds the cap', () => {
    // Pathological case that never happens in practice (chunks are ~4KB vs a
    // 320KB cap); documents that the bound is honored unconditionally.
    const buf = new BoundedAudioBuffer(100)
    buf.push(chunk(500))
    expect(buf.size).toBe(0)
    expect(buf.byteLength).toBe(0)
  })
})
