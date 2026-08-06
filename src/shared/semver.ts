/** Pure semver comparison + update-safety decisions for the auto-updater
   (part of P0#24 migration/rollback safety). Keeping this pure means the
   "is the offered build actually newer than what's installed?" guard is
   unit-testable without a real release server — so a downgrade can never be
   silently auto-applied.

   Supports MAJOR.MINOR.PATCH with an optional -prerelease tag (e.g. 1.2.0-beta.1).
   Build metadata (+...) is ignored per semver. No IO, no clock. */

export interface SemVer {
  major: number
  minor: number
  patch: number
  /** Dot-separated prerelease identifiers, or [] for a release build. */
  prerelease: string[]
}

/** Parse a version string into a SemVer, or null when it isn't valid. A leading
   'v' is tolerated. Build metadata after '+' is discarded. */
export function parseVersion(input: string): SemVer | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim().replace(/^v/i, '')
  const [core, prerelease] = trimmed.split('+')[0].split('-', 2) as [string, string?]
  const parts = core.split('.')
  if (parts.length !== 3) return null
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN))
  if (nums.some((n) => Number.isNaN(n))) return null
  return {
    major: nums[0],
    minor: nums[1],
    patch: nums[2],
    prerelease: prerelease ? prerelease.split('.') : []
  }
}

/** Compare two prerelease identifier lists per semver §11: a release (empty)
   outranks any prerelease; numeric identifiers compare numerically and rank
   below alphanumerics; more identifiers win when all prior ones are equal. */
function comparePrerelease(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1 // release > prerelease
  if (b.length === 0) return -1
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i]
    const bi = b[i]
    const aNum = /^\d+$/.test(ai)
    const bNum = /^\d+$/.test(bi)
    if (aNum && bNum) {
      const diff = Number(ai) - Number(bi)
      if (diff !== 0) return diff < 0 ? -1 : 1
    } else if (aNum !== bNum) {
      return aNum ? -1 : 1 // numeric identifiers have lower precedence
    } else if (ai !== bi) {
      return ai < bi ? -1 : 1
    }
  }
  if (a.length === b.length) return 0
  return a.length < b.length ? -1 : 1
}

/** Compare two parsed versions: -1 if a<b, 0 if equal, 1 if a>b. */
export function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1
  return comparePrerelease(a.prerelease, b.prerelease)
}

/** Whether `offered` is a strict upgrade over `current`. False when either
   string is unparseable (fail safe — don't auto-apply an update we can't
   reason about) or when offered <= current (a downgrade / re-offer). */
export function isUpgrade(current: string, offered: string): boolean {
  const c = parseVersion(current)
  const o = parseVersion(offered)
  if (!c || !o) return false
  return compareVersions(o, c) > 0
}
