/** Pre-interview self-check: probe the pieces an interview actually depends on
   (AI vision+streaming, screenshot, ASR, shortcuts, network) and roll the
   individual results up into a single readiness verdict plus the one thing most
   worth fixing. The aggregation here is pure so it can be unit-tested; the
   probes that produce CheckResult[] live in the main process. */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

/** Each probe maps to one check. `critical` means a failure blocks core use
   (you can't solve problems without it); non-critical failures only degrade. */
export interface CheckResult {
  id: string
  status: CheckStatus
  /** Short human message (already localized by the caller-facing layer, or a
     stable key the renderer localizes). */
  detail?: string
  critical: boolean
}

export type Readiness = 'ready' | 'degraded' | 'unusable'

export interface SelfCheckVerdict {
  readiness: Readiness
  /** The single most important thing to fix, or null when fully ready. The
     first critical failure, else the first non-critical failure/warn. */
  blockingCheckId: string | null
}

/** Roll individual check results into an overall verdict.
   - unusable: any critical check failed → core flow won't work
   - degraded: no critical failure, but some non-critical fail/warn → usable
     with reduced capability (e.g. no ASR, a shortcut clash)
   - ready: everything that ran passed (skipped checks don't block) */
export function aggregateSelfCheck(results: CheckResult[]): SelfCheckVerdict {
  const criticalFail = results.find((r) => r.critical && r.status === 'fail')
  if (criticalFail) {
    return { readiness: 'unusable', blockingCheckId: criticalFail.id }
  }

  const degrading = results.find((r) => r.status === 'fail' || r.status === 'warn')
  if (degrading) {
    return { readiness: 'degraded', blockingCheckId: degrading.id }
  }

  return { readiness: 'ready', blockingCheckId: null }
}
