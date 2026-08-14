import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseReleaseConfigSources } from '../src/shared/release-config-parser'
import { validateReleaseConfig } from '../src/shared/release-preflight'

// Guard the repo's ACTUAL packaging config against the preflight rules, so a
// signing / notarization / entitlement regression is caught in `npx vitest`
// before a build-machine cycle is spent (P0#24). Reads the real files rather
// than a fixture. YAML/plist are read with light parsing (no extra dep): we
// only need a handful of scalar fields.

const root = resolve(__dirname, '..')
const yml = readFileSync(resolve(root, 'electron-builder.yml'), 'utf8')
const plist = readFileSync(resolve(root, 'build/entitlements.mac.plist'), 'utf8')
const hook = readFileSync(resolve(root, 'scripts/after-pack-mac-sign.cjs'), 'utf8')

const configSources = {
  builderYaml: yml,
  entitlementsPlist: plist,
  signingHook: hook,
  hasSigningIdentity: false
}
const repoConfig = parseReleaseConfigSources(configSources)

describe('release preflight over the real repo config', () => {
  it('parses the expected values from electron-builder.yml', () => {
    expect(repoConfig.appId).toBe('com.penumbra.app')
    expect(repoConfig.publishProvider).toBe('github')
  })

  it('keeps the re-sign BUNDLE_ID in sync with appId (TCC identifier)', () => {
    // If these drift, macOS permission grants key off the wrong identifier and
    // system-audio capture silently breaks in packaged builds.
    expect(repoConfig.resignBundleId).toBe(repoConfig.appId)
  })

  it('declares the audio Info.plist keys required for packaged capture', () => {
    expect(repoConfig.infoPlistKeys).toContain('NSAudioCaptureUsageDescription')
    expect(repoConfig.infoPlistKeys).toContain('NSMicrophoneUsageDescription')
  })

  it('parses the same config after a Windows CRLF checkout', () => {
    const windowsConfig = parseReleaseConfigSources({
      ...configSources,
      builderYaml: yml.replace(/\n/g, '\r\n'),
      entitlementsPlist: plist.replace(/\n/g, '\r\n'),
      signingHook: hook.replace(/\n/g, '\r\n')
    })

    expect(windowsConfig).toEqual(repoConfig)
  })

  it('has no error-severity preflight issues (the app builds & runs)', () => {
    const errors = validateReleaseConfig(repoConfig).filter((i) => i.severity === 'error')
    expect(errors).toEqual([])
  })

  it('still flags the placeholder publish feed as a warning (known, pre-release)', () => {
    // Documents the current state: builds fine, but not publishable until the
    // GitHub owner/repo placeholders are replaced.
    const codes = validateReleaseConfig(repoConfig).map((i) => i.code)
    expect(codes).toContain('publish-placeholder')
  })
})
