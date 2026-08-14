import type { ReleaseConfig } from './release-preflight'

export interface ReleaseConfigSources {
  builderYaml: string
  entitlementsPlist: string
  signingHook: string
  hasSigningIdentity: boolean
}

function normalizeNewlines(source: string): string {
  return source.replace(/\r\n?/g, '\n')
}

function topScalar(source: string, key: string): string | undefined {
  const match = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*(?:#.*)?$`, 'm'))
  return match ? match[1].replace(/^['"]|['"]$/g, '') : undefined
}

function nestedScalar(source: string, parent: string, key: string): string | undefined {
  const block = source.match(new RegExp(`^${parent}:\\n((?:[ \\t]+.*\\n?)*)`, 'm'))
  if (!block) return undefined

  const match = block[1].match(new RegExp(`^[ \\t]+${key}:\\s*(.+?)\\s*(?:#.*)?$`, 'm'))
  return match ? match[1].replace(/^['"]|['"]$/g, '') : undefined
}

export function parseReleaseConfigSources(sources: ReleaseConfigSources): ReleaseConfig {
  const yml = normalizeNewlines(sources.builderYaml)
  const plist = normalizeNewlines(sources.entitlementsPlist)
  const hook = normalizeNewlines(sources.signingHook)
  const infoBlock = yml.match(/^\s+extendInfo:\n((?:[ \t]+.*\n?)*)/m)

  return {
    appId: topScalar(yml, 'appId'),
    resignBundleId: hook.match(/BUNDLE_ID\s*=\s*'([^']+)'/)?.[1],
    notarize: nestedScalar(yml, 'mac', 'notarize') === 'true',
    hasSigningIdentity: sources.hasSigningIdentity,
    hardenedRuntime: nestedScalar(yml, 'mac', 'hardenedRuntime') === 'true',
    infoPlistKeys: infoBlock
      ? [...infoBlock[1].matchAll(/^[ \t]+([A-Za-z]+):/gm)].map((match) => match[1])
      : [],
    entitlements: [...plist.matchAll(/<key>([^<]+)<\/key>/g)].map((match) => match[1]),
    publishProvider: nestedScalar(yml, 'publish', 'provider'),
    publishOwner: nestedScalar(yml, 'publish', 'owner'),
    publishRepo: nestedScalar(yml, 'publish', 'repo')
  }
}
