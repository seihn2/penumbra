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
import { parseReleaseConfigSources } from '../src/shared/release-config-parser.ts'
import { findRunningPackagedAppProcesses } from '../src/shared/running-packaged-app.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function hasStableLocalSigningIdentity() {
  if (process.platform !== 'darwin') return false
  try {
    execFileSync('security', ['find-certificate', '-c', 'Penumbra Local Signing'], {
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

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

const config = parseReleaseConfigSources({
  builderYaml: readFileSync(resolve(root, 'electron-builder.yml'), 'utf8'),
  entitlementsPlist: readFileSync(resolve(root, 'build/entitlements.mac.plist'), 'utf8'),
  signingHook: readFileSync(resolve(root, 'scripts/after-pack-mac-sign.cjs'), 'utf8'),
  hasSigningIdentity: Boolean(process.env.CSC_LINK || process.env.CSC_NAME),
  hasStableLocalSigningIdentity: hasStableLocalSigningIdentity()
})

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
