import { describe, expect, it } from 'vitest'
import { DEFAULT_SOAK_THRESHOLDS, evaluateSoak, type SoakSample } from '../src/shared/soak-health'

// A healthy 120-min soak sampled every 5 min: flat memory, no stuck assist, no
// reconnects, turns steadily climbing.
function healthySeries(): SoakSample[] {
  const out: SoakSample[] = []
  for (let i = 0; i < 24; i++) {
    out.push({
      elapsedMs: i * 5 * 60 * 1000,
      rssMb: 300 + (i % 3) * 5, // small jitter, no trend
      assistInFlight: false,
      reconnects: 0,
      turns: i * 4
    })
  }
  return out
}

describe('evaluateSoak', () => {
  it('passes a healthy series', () => {
    const report = evaluateSoak(healthySeries())
    expect(report.verdict).toBe('pass')
    expect(report.issues).toEqual([])
    expect(report.samples).toBe(24)
  })

  it('fails an empty series (nothing was demonstrated)', () => {
    const report = evaluateSoak([])
    expect(report.verdict).toBe('fail')
    expect(report.samples).toBe(0)
  })

  it('fails on a memory leak (unbounded growth)', () => {
    const s = healthySeries().map((sample, i) => ({ ...sample, rssMb: 300 + i * 30 }))
    const report = evaluateSoak(s)
    expect(report.verdict).toBe('fail')
    expect(report.issues.map((i) => i.code)).toContain('rss-leak')
  })

  it('fails on breaching the hard RSS ceiling', () => {
    const s = healthySeries()
    s[10].rssMb = 1500
    // A single 1500MB spike then back down: ceiling breached, but growth first−last is fine.
    const report = evaluateSoak(s)
    expect(report.verdict).toBe('fail')
    expect(report.issues.map((i) => i.code)).toContain('rss-ceiling')
  })

  it('fails on a stuck assist stream', () => {
    const s = healthySeries().map((sample, i) => ({
      ...sample,
      assistInFlight: i >= 5 // stuck true from sample 5 onward (19 consecutive)
    }))
    const report = evaluateSoak(s)
    expect(report.verdict).toBe('fail')
    expect(report.issues.map((i) => i.code)).toContain('stuck-assist')
  })

  it('tolerates a brief assist in-flight run under the threshold', () => {
    const s = healthySeries().map((sample, i) => ({
      ...sample,
      assistInFlight: i >= 5 && i <= 8 // 4 consecutive, under 12
    }))
    expect(evaluateSoak(s).verdict).toBe('pass')
  })

  it('degrades (not fails) on a reconnect storm', () => {
    // 120 min span, 200 reconnects → ~1.67/min > 1/min threshold.
    const s = healthySeries().map((sample, i) => ({ ...sample, reconnects: i * 9 }))
    const report = evaluateSoak(s)
    expect(report.verdict).toBe('degraded')
    expect(report.issues.map((i) => i.code)).toContain('reconnect-storm')
  })

  it('degrades on stalled transcription (turns frozen mid-session)', () => {
    const s = healthySeries().map((sample) => ({ ...sample, turns: 40 })) // never advances
    const report = evaluateSoak(s)
    expect(report.verdict).toBe('degraded')
    expect(report.issues.map((i) => i.code)).toContain('stalled-transcription')
  })

  it('reports fail when both an error and a warning are present', () => {
    const s = healthySeries().map((sample, i) => ({
      ...sample,
      rssMb: 300 + i * 30, // leak (error)
      reconnects: i * 9 // storm (warning)
    }))
    const report = evaluateSoak(s)
    expect(report.verdict).toBe('fail') // error dominates
    const codes = report.issues.map((i) => i.code)
    expect(codes).toContain('rss-leak')
    expect(codes).toContain('reconnect-storm')
  })

  it('honors custom thresholds', () => {
    const s = healthySeries().map((sample, i) => ({ ...sample, rssMb: 300 + i * 30 }))
    // Raise the growth allowance above the observed growth → no leak.
    const report = evaluateSoak(s, { ...DEFAULT_SOAK_THRESHOLDS, rssGrowthMb: 5000 })
    expect(report.issues.map((i) => i.code)).not.toContain('rss-leak')
  })

  it('is deterministic', () => {
    const s = healthySeries()
    expect(evaluateSoak(s)).toEqual(evaluateSoak(s))
  })
})
