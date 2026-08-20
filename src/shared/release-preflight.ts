/** Pure release-preflight validation for the macOS/Windows packaging config
   (P0#24). Signing, notarization, and publish settings only fail on a real build
   machine — minutes into a cycle, or worse, after shipping. This module takes
   the already-parsed electron-builder settings + entitlements + the environment
   flags that gate signing, and reports the problems deterministically so they
   can be caught in a unit test / a `npm run` preflight before a build.

   Pure: no IO, no clock, no randomness, no YAML/plist parsing (the caller reads
   the files and passes plain values in). */

export type PreflightSeverity = 'error' | 'warning'

export interface PreflightIssue {
  /** Stable machine code, e.g. 'bundle-id-mismatch'. */
  code: string
  severity: PreflightSeverity
}

/** The subset of packaging config this validator reasons about. All fields are
   optional so a partially-configured project still validates (missing required
   values surface as issues rather than throwing). */
export interface ReleaseConfig {
  /** electron-builder `appId`. */
  appId?: string
  /** The bundle id the afterPack re-sign hook forces (`BUNDLE_ID`). Must match
     appId or macOS TCC permission grants key off the wrong identifier. */
  resignBundleId?: string
  /** electron-builder `mac.notarize`. */
  notarize?: boolean
  /** Whether a real Apple signing identity is configured (CSC_LINK / CSC_NAME
     present, or an Apple Developer certificate). */
  hasSigningIdentity?: boolean
  /** Whether the local stable self-signed identity is installed. It preserves
     TCC grants between local rebuilds but cannot be used for notarization. */
  hasStableLocalSigningIdentity?: boolean
  /** Whether the hardened runtime is enabled (`mac.hardenedRuntime`). */
  hardenedRuntime?: boolean
  /** Info.plist usage-description keys declared under `mac.extendInfo`. */
  infoPlistKeys?: string[]
  /** Entitlement keys declared in the entitlements plist. */
  entitlements?: string[]
  /** electron-builder `publish.provider`. */
  publishProvider?: string
  /** `publish.owner` (GitHub) — a placeholder here ships an un-updatable app. */
  publishOwner?: string
  /** `publish.repo` (GitHub). */
  publishRepo?: string
}

// Info.plist keys that MUST be present for the app's audio-capture features to
// work in a packaged build (a missing NSAudioCaptureUsageDescription yields a
// silent dead system-audio stream on macOS 14.2+).
const REQUIRED_INFO_PLIST = ['NSMicrophoneUsageDescription', 'NSAudioCaptureUsageDescription']

// Entitlements the audio pipeline needs when the hardened runtime is on.
const REQUIRED_ENTITLEMENTS_FOR_AUDIO = [
  'com.apple.security.device.audio-input',
  'com.apple.security.device.microphone'
]

// Obvious placeholder values that must be replaced before publishing.
const PLACEHOLDER_OWNERS = ['penumbra', 'example', 'your-org', 'owner', '']

/** Validate a release config. Returns issues most-severe first; an empty array
   means the config is release-ready for the given signing posture.

   Rules:
   - appId missing → error; appId ≠ resignBundleId → error (TCC identifier drift).
   - Neither a real nor stable local signing identity → warning: ad-hoc signing makes the designated
     requirement depend on the build's CDHash, so macOS TCC grants (including
     Screen Recording) do not survive an app update.
   - Real signing identity but notarize:false → warning (Gatekeeper will warn
     users on first launch). No identity → notarization is impossible, so the
     notarization-specific warning is not emitted.
   - Hardened runtime on but a required audio entitlement missing → error (the
     capability is silently denied at runtime).
   - Any required Info.plist usage-description key missing → error.
   - publish.provider 'github' with a placeholder owner/repo → warning (auto-
     update feed points nowhere). */
export function validateReleaseConfig(config: ReleaseConfig): PreflightIssue[] {
  const errors: PreflightIssue[] = []
  const warnings: PreflightIssue[] = []

  if (!config.appId) {
    errors.push({ code: 'app-id-missing', severity: 'error' })
  } else if (config.resignBundleId && config.resignBundleId !== config.appId) {
    errors.push({ code: 'bundle-id-mismatch', severity: 'error' })
  }

  const info = config.infoPlistKeys ?? []
  for (const key of REQUIRED_INFO_PLIST) {
    if (!info.includes(key)) errors.push({ code: `info-plist-missing:${key}`, severity: 'error' })
  }

  if (config.hardenedRuntime) {
    const ents = config.entitlements ?? []
    for (const ent of REQUIRED_ENTITLEMENTS_FOR_AUDIO) {
      if (!ents.includes(ent)) {
        errors.push({ code: `entitlement-missing:${ent}`, severity: 'error' })
      }
    }
  }

  if (config.hasSigningIdentity === false && config.hasStableLocalSigningIdentity !== true) {
    warnings.push({ code: 'signing-identity-missing-tcc-unstable', severity: 'warning' })
  }

  // Notarization only matters once a real identity exists; without one it is
  // not achievable. The separate warning above explains the TCC consequence.
  if (config.hasSigningIdentity && config.notarize === false) {
    warnings.push({ code: 'notarize-disabled-with-identity', severity: 'warning' })
  }

  if (config.publishProvider === 'github') {
    const owner = (config.publishOwner ?? '').toLowerCase()
    const repo = (config.publishRepo ?? '').toLowerCase()
    if (PLACEHOLDER_OWNERS.includes(owner) || PLACEHOLDER_OWNERS.includes(repo)) {
      warnings.push({ code: 'publish-placeholder', severity: 'warning' })
    }
  }

  return [...errors, ...warnings]
}

/** Whether the config is safe to build+ship (no error-severity issues). */
export function isReleaseReady(config: ReleaseConfig): boolean {
  return validateReleaseConfig(config).every((issue) => issue.severity !== 'error')
}
