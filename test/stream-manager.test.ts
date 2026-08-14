import { describe, expect, it, vi } from 'vitest'
import { StreamManager } from '../src/main/services/stream-manager'

function fakeWindow() {
  const send = vi.fn()
  return { window: { webContents: { send } } as never, send }
}

describe('StreamManager retries', () => {
  it('retries a transient failure before the first chunk', async () => {
    const manager = new StreamManager()
    const context = manager.createContext()
    const { window, send } = fakeWindow()
    const onComplete = vi.fn()
    let attempts = 0

    await manager.runTextStream({
      window,
      streamContext: context,
      errorPrefix: 'test',
      createStream: () => {
        attempts += 1
        return (async function* () {
          if (attempts === 1) throw new Error('fetch failed')
          yield 'answer'
        })()
      },
      onComplete
    })

    expect(attempts).toBe(2)
    expect(send).toHaveBeenCalledWith('solution-chunk', 'answer')
    expect(send).toHaveBeenCalledWith('solution-complete')
    expect(send).not.toHaveBeenCalledWith('solution-error', expect.anything())
    expect(onComplete).toHaveBeenCalledWith('answer')
  })

  it('does not retry after partial output', async () => {
    const manager = new StreamManager()
    const context = manager.createContext()
    const { window, send } = fakeWindow()
    let attempts = 0

    await manager.runTextStream({
      window,
      streamContext: context,
      errorPrefix: 'test',
      createStream: () => {
        attempts += 1
        return (async function* () {
          yield 'partial'
          throw new Error('fetch failed')
        })()
      }
    })

    expect(attempts).toBe(1)
    expect(send).toHaveBeenCalledWith('solution-chunk', 'partial')
    expect(send).toHaveBeenCalledWith('solution-error', expect.stringContaining('网络连接失败'))
    expect(send).not.toHaveBeenCalledWith('solution-complete')
  })

  it('uses a fresh attempt controller after a first-chunk timeout', async () => {
    const manager = new StreamManager()
    const context = manager.createContext()
    const { window, send } = fakeWindow()
    let attempts = 0

    await manager.runTextStream({
      window,
      streamContext: context,
      errorPrefix: 'test',
      firstChunkTimeoutMs: 5,
      createStream: () => {
        attempts += 1
        return (async function* () {
          if (attempts === 1) {
            await new Promise((resolve) => setTimeout(resolve, 30))
            yield 'late'
            return
          }
          yield 'retry-ok'
        })()
      }
    })

    expect(attempts).toBe(2)
    expect(context.controller.signal.aborted).toBe(false)
    expect(send).toHaveBeenCalledWith('solution-chunk', 'retry-ok')
    expect(send).toHaveBeenCalledWith('solution-complete')
  })
})
