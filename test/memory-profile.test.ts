import { describe, expect, it } from 'vitest'
import {
  createEmptyProfile,
  isProfileEmpty,
  migrateLegacyMemory,
  getActiveProfile,
  profileToPromptText,
  serializeMemoryState,
  parseMemoryState,
  activeProfilePromptText,
  mergeCandidateIntoProfile,
  applyCandidatesToActive,
  isMemoryCandidateField,
  parseMemoryCandidates,
  buildDistillationPrompt,
  type MemoryState
} from '../src/shared/memory-profile'

describe('createEmptyProfile / isProfileEmpty', () => {
  it('creates a blank profile that reads as empty', () => {
    const p = createEmptyProfile('a', 'A')
    expect(p.id).toBe('a')
    expect(p.name).toBe('A')
    expect(isProfileEmpty(p)).toBe(true)
  })

  it('is non-empty once any field has content', () => {
    const p = createEmptyProfile('a', 'A')
    p.techStack = 'Go, Kubernetes'
    expect(isProfileEmpty(p)).toBe(false)
  })

  it('treats whitespace-only fields as empty', () => {
    const p = createEmptyProfile('a', 'A')
    p.freeform = '   \n  '
    expect(isProfileEmpty(p)).toBe(true)
  })
})

describe('migrateLegacyMemory', () => {
  it('puts a legacy blob into freeform of a single default profile', () => {
    const state = migrateLegacyMemory('我是一名后端工程师')
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0].freeform).toBe('我是一名后端工程师')
    expect(state.activeProfileId).toBe(state.profiles[0].id)
  })

  it('yields one empty default profile for blank/undefined input', () => {
    for (const input of ['', '   ', undefined, null]) {
      const state = migrateLegacyMemory(input)
      expect(state.profiles).toHaveLength(1)
      expect(isProfileEmpty(state.profiles[0])).toBe(true)
    }
  })
})

describe('getActiveProfile', () => {
  it('returns the profile matching activeProfileId', () => {
    const state: MemoryState = {
      profiles: [createEmptyProfile('a', 'A'), createEmptyProfile('b', 'B')],
      activeProfileId: 'b'
    }
    expect(getActiveProfile(state).id).toBe('b')
  })

  it('falls back to the first profile when the active id is stale', () => {
    const state: MemoryState = {
      profiles: [createEmptyProfile('a', 'A')],
      activeProfileId: 'gone'
    }
    expect(getActiveProfile(state).id).toBe('a')
  })

  it('returns a fresh empty profile when there are none', () => {
    const state: MemoryState = { profiles: [], activeProfileId: 'x' }
    expect(isProfileEmpty(getActiveProfile(state))).toBe(true)
  })
})

describe('profileToPromptText', () => {
  it('returns empty string for an empty profile', () => {
    expect(profileToPromptText(createEmptyProfile('a', 'A'))).toBe('')
  })

  it('labels structured fields and includes only non-empty ones', () => {
    const p = createEmptyProfile('a', 'A')
    p.targetRole = '后端工程师'
    p.techStack = 'Go, PostgreSQL'
    const text = profileToPromptText(p)
    expect(text).toContain('目标岗位：后端工程师')
    expect(text).toContain('技术栈：Go, PostgreSQL')
    expect(text).not.toContain('项目经历')
  })

  it('appends freeform text after the labeled fields', () => {
    const p = createEmptyProfile('a', 'A')
    p.highlights = '主导过千万级 QPS 系统'
    p.freeform = '额外说明一段'
    const text = profileToPromptText(p)
    const idxHighlight = text.indexOf('主导过')
    const idxFree = text.indexOf('额外说明')
    expect(idxHighlight).toBeGreaterThanOrEqual(0)
    expect(idxFree).toBeGreaterThan(idxHighlight)
  })
})

describe('serialize / parseMemoryState', () => {
  it('round-trips a multi-profile state', () => {
    const a = createEmptyProfile('a', 'A')
    a.targetRole = '后端'
    const state: MemoryState = { profiles: [a, createEmptyProfile('b', 'B')], activeProfileId: 'b' }
    const parsed = parseMemoryState(serializeMemoryState(state))
    expect(parsed.profiles).toHaveLength(2)
    expect(parsed.activeProfileId).toBe('b')
    expect(parsed.profiles[0].targetRole).toBe('后端')
  })

  it('falls back to a legacy-seeded default for empty input', () => {
    const parsed = parseMemoryState('', '旧的简历文本')
    expect(parsed.profiles).toHaveLength(1)
    expect(parsed.profiles[0].freeform).toBe('旧的简历文本')
  })

  it('falls back to default on corrupt JSON without throwing', () => {
    const parsed = parseMemoryState('{not json', '')
    expect(parsed.profiles).toHaveLength(1)
    expect(isProfileEmpty(parsed.profiles[0])).toBe(true)
  })

  it('normalizes profiles missing fields', () => {
    const raw = JSON.stringify({ profiles: [{ id: 'x', name: 'X' }], activeProfileId: 'x' })
    const parsed = parseMemoryState(raw)
    expect(parsed.profiles[0].techStack).toBe('')
    expect(isProfileEmpty(parsed.profiles[0])).toBe(true)
  })

  it('activeProfilePromptText compiles the active profile only', () => {
    const a = createEmptyProfile('a', 'A')
    a.targetRole = '前端'
    const b = createEmptyProfile('b', 'B')
    b.targetRole = '算法'
    const state: MemoryState = { profiles: [a, b], activeProfileId: 'b' }
    expect(activeProfilePromptText(state)).toContain('算法')
    expect(activeProfilePromptText(state)).not.toContain('前端')
  })
})

describe('memory candidates (confirm-gated distillation)', () => {
  it('validates candidate fields', () => {
    expect(isMemoryCandidateField('techStack')).toBe(true)
    expect(isMemoryCandidateField('projects')).toBe(true)
    expect(isMemoryCandidateField('freeform')).toBe(false)
    expect(isMemoryCandidateField('avoid')).toBe(false)
    expect(isMemoryCandidateField(42)).toBe(false)
  })

  it('appends a candidate as a new line in the target field', () => {
    const p = createEmptyProfile('a', 'A')
    p.techStack = 'Go'
    const next = mergeCandidateIntoProfile(p, { field: 'techStack', text: 'Kubernetes' })
    expect(next.techStack).toBe('Go\nKubernetes')
  })

  it('fills an empty field without a leading newline', () => {
    const p = createEmptyProfile('a', 'A')
    const next = mergeCandidateIntoProfile(p, { field: 'projects', text: '订单系统重构' })
    expect(next.projects).toBe('订单系统重构')
  })

  it('does not duplicate an already-present line (case-insensitive)', () => {
    const p = createEmptyProfile('a', 'A')
    p.techStack = 'Kubernetes'
    const next = mergeCandidateIntoProfile(p, { field: 'techStack', text: 'kubernetes' })
    expect(next).toBe(p) // unchanged reference
  })

  it('ignores blank candidate text', () => {
    const p = createEmptyProfile('a', 'A')
    expect(mergeCandidateIntoProfile(p, { field: 'techStack', text: '   ' })).toBe(p)
  })

  it('applies multiple candidates to the active profile only', () => {
    const a = createEmptyProfile('a', 'A')
    const b = createEmptyProfile('b', 'B')
    const state: MemoryState = { profiles: [a, b], activeProfileId: 'a' }
    const next = applyCandidatesToActive(state, [
      { field: 'techStack', text: 'Rust' },
      { field: 'highlights', text: '开源贡献者' }
    ])
    expect(next.profiles[0].techStack).toBe('Rust')
    expect(next.profiles[0].highlights).toBe('开源贡献者')
    expect(next.profiles[1].techStack).toBe('') // other profile untouched
  })

  it('returns the same state reference when nothing merges', () => {
    const a = createEmptyProfile('a', 'A')
    a.techStack = 'Go'
    const state: MemoryState = { profiles: [a], activeProfileId: 'a' }
    expect(applyCandidatesToActive(state, [{ field: 'techStack', text: 'go' }])).toBe(state)
  })
})

describe('parseMemoryCandidates', () => {
  it('parses a clean JSON array', () => {
    const raw = '[{"field":"techStack","text":"Rust"},{"field":"projects","text":"订单系统"}]'
    const out = parseMemoryCandidates(raw)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ field: 'techStack', text: 'Rust' })
  })

  it('extracts the array from markdown fences / surrounding prose', () => {
    const raw = '好的，我提炼到：\n```json\n[{"field":"highlights","text":"开源贡献"}]\n```\n以上。'
    const out = parseMemoryCandidates(raw)
    expect(out).toEqual([{ field: 'highlights', text: '开源贡献' }])
  })

  it('drops entries with unknown fields or non-string text', () => {
    const raw =
      '[{"field":"avoid","text":"x"},{"field":"techStack","text":123},{"field":"projects","text":"ok"}]'
    const out = parseMemoryCandidates(raw)
    expect(out).toEqual([{ field: 'projects', text: 'ok' }])
  })

  it('de-duplicates by field+text (case-insensitive)', () => {
    const raw = '[{"field":"techStack","text":"Go"},{"field":"techStack","text":"go"}]'
    expect(parseMemoryCandidates(raw)).toHaveLength(1)
  })

  it('caps the number of candidates at 8', () => {
    const items = Array.from({ length: 20 }, (_, i) => `{"field":"techStack","text":"t${i}"}`)
    const out = parseMemoryCandidates(`[${items.join(',')}]`)
    expect(out).toHaveLength(8)
  })

  it('drops absurdly long facts', () => {
    const long = 'x'.repeat(300)
    const raw = `[{"field":"projects","text":"${long}"},{"field":"projects","text":"短"}]`
    expect(parseMemoryCandidates(raw)).toEqual([{ field: 'projects', text: '短' }])
  })

  it('returns [] for empty, non-array, or garbage input', () => {
    expect(parseMemoryCandidates('')).toEqual([])
    expect(parseMemoryCandidates(null)).toEqual([])
    expect(parseMemoryCandidates('not json at all')).toEqual([])
    expect(parseMemoryCandidates('{"field":"techStack","text":"x"}')).toEqual([])
    expect(parseMemoryCandidates('[broken')).toEqual([])
  })
})

describe('buildDistillationPrompt', () => {
  it('includes the conversation context', () => {
    const p = createEmptyProfile('a', 'A')
    const prompt = buildDistillationPrompt('面试官：介绍下你自己\n我：我做过订单系统', p)
    expect(prompt).toContain('订单系统')
    expect(prompt).toContain('最近对话')
  })

  it('marks an empty profile as having no known facts', () => {
    const prompt = buildDistillationPrompt('我：我用 Go', createEmptyProfile('a', 'A'))
    expect(prompt).toContain('（空）')
  })

  it('lists existing profile facts so the model skips them', () => {
    const p = createEmptyProfile('a', 'A')
    p.techStack = 'Go'
    p.targetRole = '后端工程师'
    const prompt = buildDistillationPrompt('我：我也会 Rust', p)
    expect(prompt).toContain('不要重复')
    expect(prompt).toContain('Go')
    expect(prompt).toContain('后端工程师')
  })
})
