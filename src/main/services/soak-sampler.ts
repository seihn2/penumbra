// Soak sampler (P2#46): periodically capture a runtime health sample during a
// long session, then evaluate the captured series with the pure soak-health
// module on demand (IPC `get-soak-report`). The 120-min *capture* needs a real
// run; the pass/degraded/fail *judgement* is the tested pure logic.
//
// Sampling is opt-in (started/stopped explicitly) and bounded so it can't grow
// memory itself — the very thing it's watching for.

import { ipcMain } from 'electron'
import { evaluateSoak, type SoakSample } from '../../shared/soak-health'
import { getSoakSignals } from '../transcription'
import { getCumulativeReconnects } from '../asr/dashscope-provider'

const SAMPLE_INTERVAL_MS = 5 * 60 * 1000
// 24h of 5-min samples — a hard cap so a forgotten sampler can't grow unbounded.
const MAX_SAMPLES = 288

let samples: SoakSample[] = []
let timer: NodeJS.Timeout | null = null
let startedAt: number | null = null

function capture(now: number): void {
  if (startedAt === null) return
  const rss = process.memoryUsage().rss / (1024 * 1024)
  const { assistInFlight, turns } = getSoakSignals()
  samples.push({
    elapsedMs: now - startedAt,
    rssMb: Math.round(rss),
    assistInFlight,
    reconnects: getCumulativeReconnects(),
    turns
  })
  if (samples.length > MAX_SAMPLES) samples = samples.slice(-MAX_SAMPLES)
}

/** Begin sampling. Captures an immediate baseline, then one every interval. */
export function startSoakSampling(): void {
  if (timer) return
  startedAt = Date.now()
  samples = []
  capture(Date.now())
  timer = setInterval(() => capture(Date.now()), SAMPLE_INTERVAL_MS)
}

/** Stop sampling; the captured series is retained for a final report. */
export function stopSoakSampling(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

ipcMain.handle('start-soak-sampling', () => {
  startSoakSampling()
})

ipcMain.handle('stop-soak-sampling', () => {
  stopSoakSampling()
})

ipcMain.handle('get-soak-report', () => {
  return { ...evaluateSoak(samples), sampling: timer !== null }
})
