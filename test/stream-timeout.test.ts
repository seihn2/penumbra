import { describe, expect, it, vi } from 'vitest'
import { withFirstChunkTimeout } from '../src/shared/stream-timeout'

// Async iterable that yields the given chunks, each after `delayMs`.
async function* delayedStream(chunks: string[], delayMs: number): AsyncGenerator<string> {
  for (const c of chunks) {
    await new Promise((r) => setTimeout(r, delayMs))
    yield c
  }
}

async function collect(gen: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = []
  for await (const c of gen) out.push(c)
  return out
}

describe('withFirstChunkTimeout', () => {
  it('passes all chunks through when the first arrives in time', async () => {
    const ctrl = { abort: vi.fn() }
    const result = await collect(
      withFirstChunkTimeout(delayedStream(['a', 'b', 'c'], 5), 100, ctrl)
    )
    expect(result).toEqual(['a', 'b', 'c'])
    expect(ctrl.abort).not.toHaveBeenCalled()
  })

  it('does not bound later chunks — only the first', async () => {
    const ctrl = { abort: vi.fn() }
    // First chunk fast, a later chunk slow (60ms) but timeout is 50ms: must NOT fire.
    async function* mixed(): AsyncGenerator<string> {
      await new Promise((r) => setTimeout(r, 5))
      yield 'fast'
      await new Promise((r) => setTimeout(r, 60))
      yield 'slow'
    }
    const result = await collect(withFirstChunkTimeout(mixed(), 50, ctrl))
    expect(result).toEqual(['fast', 'slow'])
    expect(ctrl.abort).not.toHaveBeenCalled()
  })

  it('aborts and throws when the first chunk stalls past the timeout', async () => {
    const ctrl = { abort: vi.fn() }
    const onTimeout = vi.fn()
    const gen = withFirstChunkTimeout(delayedStream(['late'], 100), 20, ctrl, onTimeout)
    await expect(collect(gen)).rejects.toThrow('AI_STREAM_TIMEOUT')
    expect(ctrl.abort).toHaveBeenCalledOnce()
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('handles an empty stream without timing out', async () => {
    const ctrl = { abort: vi.fn() }
    // An already-exhausted async iterable (no chunks, completes immediately).
    const empty: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true, value: undefined })
      })
    }
    const result = await collect(withFirstChunkTimeout(empty, 100, ctrl))
    expect(result).toEqual([])
    expect(ctrl.abort).not.toHaveBeenCalled()
  })
})
