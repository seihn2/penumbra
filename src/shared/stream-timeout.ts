/** Guard an async chunk stream against a stalled provider: if the first chunk
   doesn't arrive within `firstChunkMs`, abort via the provided controller and
   throw, so the UI surfaces an error instead of spinning "生成中" forever.

   Only the time-to-first-chunk is bounded — once tokens flow, a long answer is
   fine. Pure (timer + controller injected) so it's unit-testable without a real
   model or Electron. */
export async function* withFirstChunkTimeout<T>(
  source: AsyncIterable<T>,
  firstChunkMs: number,
  controller: { abort: () => void },
  onTimeout?: () => void
): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]()

  // Race the first chunk against the timeout.
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
      onTimeout?.()
      reject(new Error('AI_STREAM_TIMEOUT'))
    }, firstChunkMs)
  })

  let first: IteratorResult<T>
  try {
    first = await Promise.race([iterator.next(), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
  if (timedOut) throw new Error('AI_STREAM_TIMEOUT')

  if (first.done) return
  yield first.value

  // First chunk arrived in time; stream the rest unbounded.
  while (true) {
    const next = await iterator.next()
    if (next.done) return
    yield next.value
  }
}
