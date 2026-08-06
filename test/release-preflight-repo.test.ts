import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateReleaseConfig, type ReleaseConfig } from '../src/shared/release-preflight'

// Guard the repo's ACTUAL packaging config against the preflight rules, so a
// signing / notarization / entitlement regression is caught in `npx vitest`
// before a build-machine cycle is spent (P0#24). Reads the real files rather
// than a fixture. YAML/plist are read with light parsing (no extra dep): we
// only need a handful of scalar fields.

const root = resolve(__dirname, '..')
const yml = readFileSync(resolve(root, 'electron-builder.yml'), 'utf8')
const plist = readFileSync(resolve(root, 'build/entitlements.mac.plist'), 'utf8')
const hook = readFileSync(resolve(root, 'scripts/after-pack-mac-sign.cjs'), 'utf8')

// Top-level `key: value` scalar (not nested). Good enough for appId etc.
function topScalar(source: string, key: string): string | undefined {
  const m = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*(?:#.*)?$`, 'm'))
  return m ? m[1].replace(/^['"]|['"]$/g, '') : undefined
}

// A `key: value` nested under a parent block (indented). Used for mac.notarize
// and publish.owner without a full YAML parser.
function nestedScalar(source: string, parent: string, key: string): string | undefined {
  const block = source.match(new RegExp(`^${parent}:\\n((?:[ \\t]+.*\\n?)*)`, 'm'))
  if (!block) return undefined
  const m = block[1].match(new RegExp(`^[ \\t]+${key}:\\s*(.+?)\\s*(?:#.*)?$`, 'm'))
  return m ? m[1].replace(/^['"]|['"]$/g, '') : undefined
}

const entitlementKeys = [...plist.matchAll(/<key>([^<]+)<\/key>/g)].map((m) => m[1])
const infoPlistKeys = (() => {
  const block = yml.match(/^\s+extendInfo:\n((?:[ \t]+.*\n?)*)/m)
  if (!block) return []
  return [...block[1].matchAll(/^[ \t]+([A-Za-z]+):/gm)].map((m) => m[1])
})()
const resignBundleId = hook.match(/BUNDLE_ID\s*=\s*'([^']+)'/)?.[1]

const repoConfig: ReleaseConfig = {
  appId: topScalar(yml, 'appId'),
  resignBundleId,
  notarize: nestedScalar(yml, 'mac', 'notarize') === 'true',
  hasSigningIdentity: false, // committed repo has no identity configured
  hardenedRuntime: nestedScalar(yml, 'mac', 'hardenedRuntime') === 'true',
  infoPlistKeys,
  entitlements: entitlementKeys,
  publishProvider: nestedScalar(yml, 'publish', 'provider'),
  publishOwner: nestedScalar(yml, 'publish', 'owner'),
  publishRepo: nestedScalar(yml, 'publish', 'repo')
}

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
