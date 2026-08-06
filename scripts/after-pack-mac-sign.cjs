// electron-builder afterPack hook (macOS only).
//
// Why this exists: with no Apple Developer identity configured, electron-builder
// ad-hoc signs the app but leaves the code-signing *identifier* as "Electron"
// (inherited from the framework). macOS TCC keys Screen Recording / Microphone
// permission off the signing identifier, not the bundle id — so an "Electron"
// identifier means the app's permission grants collide with every other ad-hoc
// Electron app and never stick. Symptom: system-audio (getDisplayMedia loopback)
// fails with NotAllowedError no matter how many times the user re-grants.
//
// Worse, an *ad-hoc* signature's hash changes on every build, so even with a
// fixed identifier macOS treats each rebuild as a new app and the permission
// grant is lost on every repackage. To make the grant STICK across rebuilds we
// sign with a stable self-signed identity ("Penumbra Local Signing") when it is
// present in the keychain (created once via scripts/create-signing-cert.sh).
// When it's absent we fall back to ad-hoc with the corrected identifier — the
// app still runs and is stealthed, the grant just won't survive a rebuild.
//
// We deliberately do NOT pass --options runtime: ad-hoc signature + hardened
// runtime is rejected by AMFI on macOS, producing a "Penumbra is damaged /
// can't be opened" launch failure. (A self-signed identity is not Apple-trusted
// either, so we keep the runtime flag off for it too.)
//
// This is a no-op when a real signing identity is configured (CSC_LINK etc.) —
// in that case electron-builder already produces a correctly-identified
// signature and we skip to avoid clobbering it.

const { execFileSync } = require('child_process')
const { existsSync, readdirSync } = require('fs')
const { join } = require('path')

const BUNDLE_ID = 'com.penumbra.app'
const STABLE_IDENTITY = 'Penumbra Local Signing'

// Probe the keychain for the stable self-signed identity. We can't rely on
// `security find-identity -p codesigning` (a self-signed cert isn't listed
// there until trusted), so we just check whether codesign can resolve the name
// by attempting a dry signature on a throwaway copy is overkill — instead we
// look for the certificate by common name.
function hasStableIdentity() {
  try {
    execFileSync('sh', ['-c', `security find-certificate -c "${STABLE_IDENTITY}" >/dev/null 2>&1`])
    return true
  } catch {
    return false
  }
}

exports.default = async function afterPackMacSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  // Respect a real signing identity if one is configured; don't override it.
  if (process.env.CSC_LINK || process.env.CSC_NAME) {
    console.log('[after-pack-mac-sign] real signing identity present — skipping re-sign')
    return
  }

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = join(context.appOutDir, appName)
  if (!existsSync(appPath)) {
    console.warn(`[after-pack-mac-sign] app not found at ${appPath} — skipping`)
    return
  }

  const entitlements = join(context.packager.projectDir, 'build', 'entitlements.mac.plist')
  const frameworksDir = join(appPath, 'Contents', 'Frameworks')

  // Prefer the stable self-signed identity so the macOS permission grant
  // survives rebuilds; fall back to ad-hoc ('-') when it isn't installed.
  const useStable = hasStableIdentity()
  const signWith = useStable ? STABLE_IDENTITY : '-'
  console.log(
    useStable
      ? `[after-pack-mac-sign] signing with stable identity "${STABLE_IDENTITY}"`
      : '[after-pack-mac-sign] stable identity not found — ad-hoc signing (grant will not survive rebuilds; run scripts/create-signing-cert.sh)'
  )

  const codesign = (args) => execFileSync('codesign', args, { stdio: ['ignore', 'ignore', 'pipe'] })

  // Inside-out: frameworks first, then helper apps (with the right identifier
  // + entitlements), then the top-level app. When electron-builder has no valid
  // Apple identity it can leave Electron's frameworks with linker-only ad-hoc
  // signatures. Those signatures don't seal bundled resources, so a DMG may be
  // created successfully but fail `codesign --verify --deep --strict` on another
  // machine. Re-sign every top-level framework to produce a complete resource
  // envelope before the app seals their hashes.
  if (existsSync(frameworksDir)) {
    for (const entry of readdirSync(frameworksDir)) {
      if (!entry.endsWith('.framework')) continue
      codesign(['--force', '--sign', signWith, join(frameworksDir, entry)])
    }

    for (const entry of readdirSync(frameworksDir)) {
      if (!entry.endsWith('.app')) continue
      const helper = join(frameworksDir, entry)
      codesign([
        '--force',
        '--sign',
        signWith,
        '--identifier',
        BUNDLE_ID,
        '--entitlements',
        entitlements,
        helper
      ])
    }
  }

  codesign([
    '--force',
    '--sign',
    signWith,
    '--identifier',
    BUNDLE_ID,
    '--entitlements',
    entitlements,
    appPath
  ])

  // Verify the identifier actually took, so a silent regression fails the build.
  // codesign -dvv prints its details to stderr.
  const details = execFileSync('codesign', ['-dvv', appPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const combined = typeof details === 'string' ? details : ''
  let identifierOk = combined.includes(`Identifier=${BUNDLE_ID}`)
  if (!identifierOk) {
    try {
      execFileSync('sh', [
        '-c',
        `codesign -dvv "${appPath}" 2>&1 | grep -q "Identifier=${BUNDLE_ID}"`
      ])
      identifierOk = true
    } catch {
      identifierOk = false
    }
  }
  if (!identifierOk) {
    throw new Error(
      `[after-pack-mac-sign] re-sign verification failed: identifier is not ${BUNDLE_ID}`
    )
  }

  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: ['ignore', 'ignore', 'pipe']
  })
  console.log(`[after-pack-mac-sign] re-signed ${appName} with identifier ${BUNDLE_ID}`)
}
