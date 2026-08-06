/** Pure soak / quality-benchmark health evaluator (P2#46).

   A 120-minute soak captures a time-series of runtime samples (memory, whether
   an AI assist is stuck in-flight, ASR reconnect count, transcript turn count).
   The *capture* needs a real long-running session, but the *judgement* — "is
   this healthy, degraded, or failing?" — is deterministic and belongs here so
   it's unit-testable and the pass/fail bar can't silently drift.

   What it catches:
   - **Memory leak / ceiling**: RSS climbing without bound, or breaching a hard
     ceiling.
   - **Stuck assist**: assistInFlight staying true across many samples means a
     stream never resolved and is blocking every later assist.
   - **Reconnect storm**: ASR reconnects accumulating faster than a slow trickle
     (a flapping connection, not the occasional blip).
   - **Stalled transcription**: turn count frozen for a long stretch while the
     session claims to be active (a dead audio pipe).

   Pure: no IO, no clock, no randomness. The caller captures samples (each
   stamped with an elapsed-ms offset) and passes the series in. */

export interface SoakSample {
  /** Milliseconds since the soak started (monotonic, ascending). */
  elapsedMs: number
  /** Resident set size in MB at this sample. */
  rssMb: number
  /** Whether an AI assist was mid-stream at this sample. */
  assistInFlight: boolean
  /** Cumulative ASR reconnect count so far. */
  reconnects: number
  /** Cumulative finalized transcript turns so far. */
  turns: number
}

export interface SoakThresholds {
  /** Hard RSS ceiling in MB — any sample above this fails. */
  rssCeilingMb: number
  /** Max allowed RSS growth (last − first) in MB before it's a leak. */
  rssGrowthMb: number
  /** Max consecutive samples with assistInFlight before it's "stuck". */
  maxStuckAssistSamples: number
  /** Max reconnects per minute (averaged over the soak) before "storm". */
  maxReconnectsPerMin: number
  /** Longest stretch (ms) turns may stay frozen mid-session before "stalled". */
  maxStalledMs: number
}

export const DEFAULT_SOAK_THRESHOLDS: SoakThresholds = {
  rssCeilingMb: 1200,
  rssGrowthMb: 400,
  maxStuckAssistSamples: 12,
  maxReconnectsPerMin: 1,
  maxStalledMs: 10 * 60 * 1000
}

export type SoakVerdict = 'pass' | 'degraded' | 'fail'

export interface SoakIssue {
  code: 'rss-ceiling' | 'rss-leak' | 'stuck-assist' | 'reconnect-storm' | 'stalled-transcription'
  severity: 'warning' | 'error'
  detail: string
}

export interface SoakReport {
  verdict: SoakVerdict
  issues: SoakIssue[]
  /** Sample count evaluated (0 → verdict is always 'fail': nothing captured). */
  samples: number
}

/** The longest run of consecutive samples for which `pred` holds. */
function longestRun(samples: SoakSample[], pred: (s: SoakSample) => boolean): number {
  let best = 0
  let run = 0
  for (const s of samples) {
    run = pred(s) ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

/** The longest stretch (ms) over which `turns` did not increase while the
   session was active (a plausibly dead audio pipe). Considers each maximal run
   of frozen turns and measures its elapsed span. */
function longestStalledMs(samples: SoakSample[]): number {
  let worst = 0
  let runStart = 0
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].turns === samples[i - 1].turns) {
      const span = samples[i].elapsedMs - samples[runStart].elapsedMs
      if (span > worst) worst = span
    } else {
      runStart = i
    }
  }
  return worst
}

/** Evaluate a captured soak series against the thresholds. Errors force 'fail';
   warnings force at least 'degraded'; a clean series is 'pass'. An empty series
   fails (a soak that captured nothing did not demonstrate health). */
export function evaluateSoak(
  samples: SoakSample[],
  thresholds: SoakThresholds = DEFAULT_SOAK_THRESHOLDS
): SoakReport {
  if (samples.length === 0) {
    return {
      verdict: 'fail',
      issues: [{ code: 'stalled-transcription', severity: 'error', detail: 'no samples captured' }],
      samples: 0
    }
  }

  const issues: SoakIssue[] = []

  const peakRss = Math.max(...samples.map((s) => s.rssMb))
  if (peakRss > thresholds.rssCeilingMb) {
    issues.push({
      code: 'rss-ceiling',
      severity: 'error',
      detail: `peak RSS ${peakRss}MB > ceiling ${thresholds.rssCeilingMb}MB`
    })
  }

  const growth = samples[samples.length - 1].rssMb - samples[0].rssMb
  if (growth > thresholds.rssGrowthMb) {
    issues.push({
      code: 'rss-leak',
      severity: 'error',
      detail: `RSS grew ${growth}MB > allowed ${thresholds.rssGrowthMb}MB`
    })
  }

  const stuck = longestRun(samples, (s) => s.assistInFlight)
  if (stuck > thresholds.maxStuckAssistSamples) {
    issues.push({
      code: 'stuck-assist',
      severity: 'error',
      detail: `assist in-flight for ${stuck} consecutive samples`
    })
  }

  const totalReconnects = samples[samples.length - 1].reconnects - samples[0].reconnects
  const spanMin = (samples[samples.length - 1].elapsedMs - samples[0].elapsedMs) / 60000
  const perMin = spanMin > 0 ? totalReconnects / spanMin : 0
  if (perMin > thresholds.maxReconnectsPerMin) {
    issues.push({
      code: 'reconnect-storm',
      severity: 'warning',
      detail: `${perMin.toFixed(2)} reconnects/min > ${thresholds.maxReconnectsPerMin}`
    })
  }

  const stalled = longestStalledMs(samples)
  if (stalled > thresholds.maxStalledMs) {
    issues.push({
      code: 'stalled-transcription',
      severity: 'warning',
      detail: `turns frozen for ${Math.round(stalled / 60000)}min`
    })
  }

  const hasError = issues.some((i) => i.severity === 'error')
  const verdict: SoakVerdict = hasError ? 'fail' : issues.length > 0 ? 'degraded' : 'pass'
  return { verdict, issues, samples: samples.length }
}
