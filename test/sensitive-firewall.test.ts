import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  anonymizeForShare,
  countByCategory,
  hasSensitive,
  redactText
} from '../src/shared/sensitive-firewall'

describe('redactText — category detection', () => {
  it('redacts an sk- style API key', () => {
    const out = redactText('use sk-ABCD1234efgh5678ijkl for auth')
    expect(out.text).toBe('use [REDACTED_API_KEY] for auth')
    expect(out.redactions[0].category).toBe('api-key')
  })

  it('redacts an AWS AKIA access key', () => {
    const out = redactText('key AKIAIOSFODNN7EXAMPLE here')
    expect(out.text).toBe('key [REDACTED_API_KEY] here')
    expect(out.redactions[0].category).toBe('api-key')
  })

  it('redacts a long secret after an apikey hint', () => {
    const out = redactText('apikey: 0123456789abcdef0123456789abcdef')
    expect(out.text).toBe('apikey: [REDACTED_API_KEY]')
    expect(out.redactions[0].category).toBe('api-key')
  })

  it('redacts a Bearer token', () => {
    const out = redactText('Authorization: Bearer abcDEF123456ghiJKL')
    expect(out.text).toBe('Authorization: Bearer [REDACTED_TOKEN]')
    expect(out.redactions[0].category).toBe('token')
  })

  it('redacts a GitHub ghp_ token', () => {
    const out = redactText('token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345 ok')
    expect(out.text).toBe('token [REDACTED_TOKEN] ok')
    expect(out.redactions[0].category).toBe('token')
  })

  it('redacts a Slack xoxb token', () => {
    const out = redactText('slack xoxb-123456789012-abcdefABCDEF here')
    expect(out.text).toBe('slack [REDACTED_TOKEN] here')
    expect(out.redactions[0].category).toBe('token')
  })

  it('redacts an email address', () => {
    const out = redactText('contact me at jane.doe@example.com please')
    expect(out.text).toBe('contact me at [REDACTED_EMAIL] please')
    expect(out.redactions[0].category).toBe('email')
  })

  it('redacts an E.164 phone number', () => {
    const out = redactText('call +8613800138000 now')
    expect(out.text).toBe('call [REDACTED_PHONE] now')
    expect(out.redactions[0].category).toBe('phone')
  })

  it('redacts a dashed CN mobile number', () => {
    const out = redactText('my number is 138-0013-8000 ok')
    expect(out.text).toBe('my number is [REDACTED_PHONE] ok')
    expect(out.redactions[0].category).toBe('phone')
  })

  it('redacts a US formatted phone number', () => {
    const out = redactText('reach (415) 555-0132 today')
    expect(out.text).toBe('reach [REDACTED_PHONE] today')
    expect(out.redactions[0].category).toBe('phone')
  })

  it('redacts a zoom meeting id', () => {
    const out = redactText('zoom meeting 1234567890 starts soon')
    expect(out.text).toBe('zoom meeting [REDACTED_MEETING_ID] starts soon')
    expect(out.redactions[0].category).toBe('meeting-id')
  })

  it('redacts a 会议 meeting id', () => {
    const out = redactText('会议号 98765432101 请加入')
    expect(out.text).toBe('会议号 [REDACTED_MEETING_ID] 请加入')
    expect(out.redactions[0].category).toBe('meeting-id')
  })

  it('redacts a macOS repo path', () => {
    const out = redactText('open /Users/alice/projects/secret-repo/main.ts now')
    expect(out.text).toBe('open [REDACTED_REPO_PATH] now')
    expect(out.redactions[0].category).toBe('repo-path')
  })

  it('redacts a Windows repo path', () => {
    const out = redactText('open C:\\Users\\bob\\code\\app.ts now')
    expect(out.text).toBe('open [REDACTED_REPO_PATH] now')
    expect(out.redactions[0].category).toBe('repo-path')
  })
})

describe('redactText — never-send custom list', () => {
  it('redacts a custom word case-insensitively', () => {
    const out = redactText('Project Phoenix is our codename', { neverSend: ['phoenix'] })
    expect(out.text).toBe('Project [REDACTED_CUSTOM] is our codename')
    expect(out.redactions[0].category).toBe('custom')
  })

  it('matches whole tokens only, not substrings', () => {
    const out = redactText('the phoenixdown item', { neverSend: ['phoenix'] })
    expect(out.text).toBe('the phoenixdown item')
    expect(out.redactions).toHaveLength(0)
  })

  it('custom list takes priority over built-in detectors', () => {
    const out = redactText('secret jane@example.com leaked', {
      neverSend: ['jane@example.com']
    })
    expect(out.redactions).toHaveLength(1)
    expect(out.redactions[0].category).toBe('custom')
  })
})

describe('redactText — positions and structure', () => {
  it('reports positions that map onto the original text', () => {
    const input = 'email jane.doe@example.com end'
    const out = redactText(input)
    const r = out.redactions[0]
    expect(input.slice(r.start, r.end)).toBe('jane.doe@example.com')
    expect(r.original).toBe('jane.doe@example.com')
  })

  it('handles multiple redactions in one string with correct order', () => {
    const input = 'mail a@b.com key sk-ABCD1234efgh5678ijkl done'
    const out = redactText(input)
    expect(out.redactions).toHaveLength(2)
    expect(out.redactions[0].category).toBe('email')
    expect(out.redactions[1].category).toBe('api-key')
    expect(out.text).toBe('mail [REDACTED_EMAIL] key [REDACTED_API_KEY] done')
  })
})

describe('redactText — idempotency & pass-through', () => {
  it('is idempotent (second pass yields identical text)', () => {
    const input = 'key sk-ABCD1234efgh5678ijkl mail a@b.com path /Users/x/y'
    const once = redactText(input).text
    const twice = redactText(once).text
    expect(twice).toBe(once)
  })

  it('never re-redacts existing placeholders', () => {
    const out = redactText('already [REDACTED_EMAIL] present')
    expect(out.redactions).toHaveLength(0)
    expect(out.text).toBe('already [REDACTED_EMAIL] present')
  })

  it('passes non-sensitive prose through unchanged', () => {
    const input = 'This is an ordinary sentence about coding interviews.'
    const out = redactText(input)
    expect(out.text).toBe(input)
    expect(out.redactions).toHaveLength(0)
  })

  it('does not redact ordinary short numbers or identifiers', () => {
    const input = 'let total = 42 and version 3 with id abc'
    const out = redactText(input)
    expect(out.text).toBe(input)
    expect(out.redactions).toHaveLength(0)
  })
})

describe('hasSensitive', () => {
  it('is true when a secret is present', () => {
    expect(hasSensitive('token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345')).toBe(true)
  })

  it('is false for clean text', () => {
    expect(hasSensitive('nothing to see here')).toBe(false)
  })

  it('is true when a custom never-send word is present', () => {
    expect(hasSensitive('codename Falcon', { neverSend: ['falcon'] })).toBe(true)
  })
})

describe('anonymizeForShare', () => {
  it('removes both never-send words and built-in secrets', () => {
    const input = 'Project Falcon email jane@example.com key sk-ABCD1234efgh5678ijkl'
    const shared = anonymizeForShare(input, { neverSend: ['falcon'] })
    expect(shared).toBe('Project [REDACTED_CUSTOM] email [REDACTED_EMAIL] key [REDACTED_API_KEY]')
    expect(shared).not.toContain('Falcon')
    expect(shared).not.toContain('jane@example.com')
    expect(shared).not.toContain('sk-ABCD1234efgh5678ijkl')
  })
})

describe('countByCategory', () => {
  it('tallies redactions per category with zero defaults', () => {
    const input = 'a@b.com c@d.com call +8613800138000 path /Users/x/y'
    const counts = countByCategory(redactText(input))
    expect(counts.email).toBe(2)
    expect(counts.phone).toBe(1)
    expect(counts['repo-path']).toBe(1)
    expect(counts['api-key']).toBe(0)
    expect(counts.token).toBe(0)
    expect(counts['meeting-id']).toBe(0)
    expect(counts.custom).toBe(0)
  })
})

describe('purity & determinism', () => {
  it('produces identical output across repeated calls', () => {
    const input = 'mail a@b.com key sk-ABCD1234efgh5678ijkl'
    const first = redactText(input)
    const second = redactText(input)
    expect(second.text).toBe(first.text)
    expect(second.redactions).toEqual(first.redactions)
  })

  it('does not mutate shared regex state between calls', () => {
    const a = redactText('a@b.com').text
    const b = redactText('a@b.com').text
    expect(a).toBe('[REDACTED_EMAIL]')
    expect(b).toBe('[REDACTED_EMAIL]')
  })

  it('uses no clock or randomness in the source', () => {
    // Guard against accidental impurity being introduced later.
    const src = readFileSync(resolve('src/shared/sensitive-firewall.ts'), 'utf8')
    expect(src).not.toMatch(/Date\.now/)
    expect(src).not.toMatch(/Math\.random/)
  })
})
