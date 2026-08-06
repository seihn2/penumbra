import { describe, expect, it } from 'vitest'
import { compareVersions, isUpgrade, parseVersion } from '../src/shared/semver'

describe('parseVersion', () => {
  it('parses MAJOR.MINOR.PATCH', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] })
  })

  it('tolerates a leading v and discards build metadata', () => {
    expect(parseVersion('v1.2.3+build.7')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: []
    })
  })

  it('parses a prerelease tag', () => {
    expect(parseVersion('1.2.0-beta.1')).toEqual({
      major: 1,
      minor: 2,
      patch: 0,
      prerelease: ['beta', '1']
    })
  })

  it('returns null for invalid input', () => {
    expect(parseVersion('1.2')).toBeNull()
    expect(parseVersion('1.2.x')).toBeNull()
    expect(parseVersion('')).toBeNull()
    // @ts-expect-error testing runtime guard
    expect(parseVersion(null)).toBeNull()
  })
})

describe('compareVersions', () => {
  const cmp = (a: string, b: string) => compareVersions(parseVersion(a)!, parseVersion(b)!)

  it('orders by major, minor, patch', () => {
    expect(cmp('2.0.0', '1.9.9')).toBe(1)
    expect(cmp('1.2.0', '1.1.9')).toBe(1)
    expect(cmp('1.2.4', '1.2.3')).toBe(1)
    expect(cmp('1.2.3', '1.2.3')).toBe(0)
    expect(cmp('1.0.0', '2.0.0')).toBe(-1)
  })

  it('ranks a release above its prerelease', () => {
    expect(cmp('1.2.0', '1.2.0-beta.1')).toBe(1)
    expect(cmp('1.2.0-beta.1', '1.2.0')).toBe(-1)
  })

  it('orders prerelease identifiers per semver', () => {
    expect(cmp('1.2.0-beta.2', '1.2.0-beta.1')).toBe(1)
    expect(cmp('1.2.0-alpha', '1.2.0-beta')).toBe(-1)
    // numeric identifiers rank below alphanumeric
    expect(cmp('1.2.0-1', '1.2.0-alpha')).toBe(-1)
    // more identifiers win when the prefix is equal
    expect(cmp('1.2.0-beta.1.1', '1.2.0-beta.1')).toBe(1)
  })
})

describe('isUpgrade', () => {
  it('is true only for a strictly newer version', () => {
    expect(isUpgrade('1.8.0', '1.8.1')).toBe(true)
    expect(isUpgrade('1.8.0', '2.0.0')).toBe(true)
  })

  it('is false for the same or older version (downgrade guard)', () => {
    expect(isUpgrade('1.8.0', '1.8.0')).toBe(false)
    expect(isUpgrade('1.8.0', '1.7.9')).toBe(false)
    expect(isUpgrade('1.8.0', '1.8.0-beta.1')).toBe(false)
  })

  it('is false (fail safe) when either version is unparseable', () => {
    expect(isUpgrade('bad', '1.8.1')).toBe(false)
    expect(isUpgrade('1.8.0', 'bad')).toBe(false)
  })
})
