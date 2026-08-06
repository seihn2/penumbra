import { describe, expect, it } from 'vitest'
import {
  isReleaseReady,
  validateReleaseConfig,
  type ReleaseConfig
} from '../src/shared/release-preflight'

// A config that mirrors the repo's own electron-builder.yml once placeholders
// are fixed and a real identity is configured — the "release-ready" baseline.
const READY: ReleaseConfig = {
  appId: 'com.penumbra.app',
  resignBundleId: 'com.penumbra.app',
  notarize: true,
  hasSigningIdentity: true,
  hardenedRuntime: true,
  infoPlistKeys: ['NSMicrophoneUsageDescription', 'NSAudioCaptureUsageDescription'],
  entitlements: ['com.apple.security.device.audio-input', 'com.apple.security.device.microphone'],
  publishProvider: 'github',
  publishOwner: 'real-org',
  publishRepo: 'penumbra-releases'
}

const codes = (c: ReleaseConfig): string[] => validateReleaseConfig(c).map((i) => i.code)

describe('validateReleaseConfig', () => {
  it('passes a fully-configured release', () => {
    expect(validateReleaseConfig(READY)).toEqual([])
    expect(isReleaseReady(READY)).toBe(true)
  })

  it('flags a missing appId', () => {
    expect(codes({ ...READY, appId: undefined })).toContain('app-id-missing')
  })

  it('flags a bundle-id / appId mismatch (TCC identifier drift)', () => {
    expect(codes({ ...READY, resignBundleId: 'com.electron.app' })).toContain('bundle-id-mismatch')
  })

  it('flags missing required Info.plist usage-description keys', () => {
    expect(codes({ ...READY, infoPlistKeys: ['NSMicrophoneUsageDescription'] })).toContain(
      'info-plist-missing:NSAudioCaptureUsageDescription'
    )
  })

  it('flags a missing audio entitlement only when hardened runtime is on', () => {
    const missing = { ...READY, entitlements: ['com.apple.security.device.microphone'] }
    expect(codes(missing)).toContain('entitlement-missing:com.apple.security.device.audio-input')
    // With hardened runtime off, the entitlement gap is not fatal.
    expect(codes({ ...missing, hardenedRuntime: false })).not.toContain(
      'entitlement-missing:com.apple.security.device.audio-input'
    )
  })

  it('warns when a real identity ships without notarization', () => {
    const c = { ...READY, notarize: false }
    expect(codes(c)).toContain('notarize-disabled-with-identity')
    expect(isReleaseReady(c)).toBe(true) // warning, not a blocker
  })

  it('does not flag notarize:false when there is no signing identity', () => {
    const c = { ...READY, hasSigningIdentity: false, notarize: false }
    expect(codes(c)).not.toContain('notarize-disabled-with-identity')
  })

  it('warns on a placeholder publish owner/repo', () => {
    expect(codes({ ...READY, publishOwner: 'penumbra', publishRepo: 'penumbra' })).toContain(
      'publish-placeholder'
    )
  })

  it('reports errors before warnings', () => {
    const issues = validateReleaseConfig({
      ...READY,
      appId: undefined,
      publishOwner: 'penumbra'
    })
    const firstWarningIdx = issues.findIndex((i) => i.severity === 'warning')
    const lastErrorIdx = issues.map((i) => i.severity).lastIndexOf('error')
    expect(lastErrorIdx).toBeLessThan(firstWarningIdx)
  })

  it('isReleaseReady is false when any error exists', () => {
    expect(isReleaseReady({ ...READY, appId: undefined })).toBe(false)
  })

  it('reflects the repo current state: placeholder publish + ad-hoc signing', () => {
    // The repo as committed: no real identity, notarize false, placeholder feed.
    const current: ReleaseConfig = {
      appId: 'com.penumbra.app',
      resignBundleId: 'com.penumbra.app',
      notarize: false,
      hasSigningIdentity: false,
      hardenedRuntime: false,
      infoPlistKeys: ['NSMicrophoneUsageDescription', 'NSAudioCaptureUsageDescription'],
      entitlements: [
        'com.apple.security.device.audio-input',
        'com.apple.security.device.microphone'
      ],
      publishProvider: 'github',
      publishOwner: 'penumbra',
      publishRepo: 'penumbra'
    }
    // Builds & runs (no errors) but not publishable (placeholder warning).
    expect(isReleaseReady(current)).toBe(true)
    expect(codes(current)).toEqual(['publish-placeholder'])
  })
})
