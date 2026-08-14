// Release preflight gate (P0#24): validate the real packaging config before a
// build cycle so a signing / notarization / entitlement / publish-feed
// misconfiguration fails fast instead of shipping. Runs the SAME pure
// validateReleaseConfig() the unit tests use (imported via Node type-stripping)
// over the actual electron-builder.yml + entitlements plist.
//
// Wired into build:mac / build:win / build:linux. Exits non-zero on any
// error-severity issue (blocks the build); warnings are printed but allowed so
// a pre-release build with a placeholder publish feed still succeeds.
//
// Run directly: node scripts/release-preflight.mjs

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { validateReleaseConfig } from '../src/shared/release-preflight.ts'
import { findRunningPackagedAppProcesses } from '../src/shared/running-packaged-app.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (process.platform === 'darwin') {
  const processTable = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
  const runningBuildTargets = findRunningPackagedAppProcesses(processTable, root)
  if (runningBuildTargets.length > 0) {
    for (const processInfo of runningBuildTargets) {
      console.error(`  ✖ ERROR   packaged-app-running pid=${processInfo.pid}`)
    }
    console.error('退出仓库 dist 中正在运行的 Penumbra 后再打包，避免覆盖运行中的 App。')
    process.exit(1)
  }
}

const yml = readFileSync(resolve(root, 'electron-builder.yml'), 'utf8')
const plist = readFileSync(resolve(root, 'build/entitlements.mac.plist'), 'utf8')
const hook = readFileSync(resolve(root, 'scripts/after-pack-mac-sign.cjs'), 'utf8')

// Light YAML/plist parsing (no dep): we only need a few scalar fields, matching
// the approach in test/release-preflight-repo.test.ts.
function topScalar(source, key) {
  const m = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*(?:#.*)?$`, 'm'))
  return m ? m[1].replace(/^['"]|['"]$/g, '') : undefined
}
function nestedScalar(source, parent, key) {
  const block = source.match(new RegExp(`^${parent}:\\n((?:[ \\t]+.*\\n?)*)`, 'm'))
  if (!block) return undefined
  const m = block[1].match(new RegExp(`^[ \\t]+${key}:\\s*(.+?)\\s*(?:#.*)?$`, 'm'))
  return m ? m[1].replace(/^['"]|['"]$/g, '') : undefined
}

const entitlements = [...plist.matchAll(/<key>([^<]+)<\/key>/g)].map((m) => m[1])
const infoBlock = yml.match(/^\s+extendInfo:\n((?:[ \t]+.*\n?)*)/m)
const infoPlistKeys = infoBlock
  ? [...infoBlock[1].matchAll(/^[ \t]+([A-Za-z]+):/gm)].map((m) => m[1])
  : []

const config = {
  appId: topScalar(yml, 'appId'),
  resignBundleId: hook.match(/BUNDLE_ID\s*=\s*'([^']+)'/)?.[1],
  notarize: nestedScalar(yml, 'mac', 'notarize') === 'true',
  hasSigningIdentity: Boolean(process.env.CSC_LINK || process.env.CSC_NAME),
  hardenedRuntime: nestedScalar(yml, 'mac', 'hardenedRuntime') === 'true',
  infoPlistKeys,
  entitlements,
  publishProvider: nestedScalar(yml, 'publish', 'provider'),
  publishOwner: nestedScalar(yml, 'publish', 'owner'),
  publishRepo: nestedScalar(yml, 'publish', 'repo')
}

const issues = validateReleaseConfig(config)
const errors = issues.filter((i) => i.severity === 'error')
const warnings = issues.filter((i) => i.severity === 'warning')

for (const e of errors) console.error(`  ✖ ERROR   ${e.code}`)
for (const w of warnings) console.warn(`  ⚠ WARNING ${w.code}`)

if (errors.length === 0 && warnings.length === 0) {
  console.log('release preflight: OK')
} else {
  console.log(`release preflight: ${errors.length} error(s), ${warnings.length} warning(s)`)
}

if (errors.length > 0) {
  console.error('release preflight FAILED — fix the errors above before building.')
  process.exit(1)
}
