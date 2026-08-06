import { describe, expect, it } from 'vitest'
import {
  CandidateProfile,
  JobDescription,
  buildBrief,
  collectMetrics,
  matchStack,
  selectProjects
} from '../src/shared/opportunity-brief'

function makeProfile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    techStack: ['React', 'TypeScript', 'Node.js'],
    projects: [
      { name: 'Realtime Chat', highlights: ['built with React'], metrics: ['10k QPS'] },
      { name: 'Data Pipeline', highlights: ['Kafka streaming'], metrics: ['99.9% uptime'] }
    ],
    strengths: ['owner mentality'],
    weaknesses: ['limited Go experience'],
    ...overrides
  }
}

function makeJd(overrides: Partial<JobDescription> = {}): JobDescription {
  return {
    title: 'Frontend Engineer',
    company: 'Acme',
    mustHave: ['React', 'TypeScript'],
    niceToHave: ['GraphQL'],
    keywords: ['React', 'Kafka'],
    ...overrides
  }
}

const EMPTY_PROFILE: CandidateProfile = {
  techStack: [],
  projects: [],
  strengths: [],
  weaknesses: []
}

const EMPTY_JD: JobDescription = {
  title: '',
  company: '',
  mustHave: [],
  niceToHave: [],
  keywords: []
}

describe('matchStack', () => {
  it('splits must-haves into covered and missing', () => {
    const result = matchStack(makeProfile(), makeJd({ mustHave: ['React', 'Go'] }))
    expect(result.covered).toEqual(['React'])
    expect(result.missing).toEqual(['Go'])
  })

  it('matches case-insensitively for covered', () => {
    const profile = makeProfile({ techStack: ['react', 'TYPESCRIPT'] })
    const jd = makeJd({ mustHave: ['REACT', 'typescript'] })
    expect(matchStack(profile, jd).covered).toEqual(['REACT', 'typescript'])
    expect(matchStack(profile, jd).missing).toEqual([])
  })

  it('treats missing case-insensitively too', () => {
    const jd = makeJd({ mustHave: ['Rust'] })
    expect(matchStack(makeProfile(), jd).missing).toEqual(['Rust'])
  })

  it('returns empty arrays when there are no must-haves', () => {
    expect(matchStack(makeProfile(), makeJd({ mustHave: [] }))).toEqual({
      covered: [],
      missing: []
    })
  })

  it('preserves JD must-have order in covered', () => {
    const jd = makeJd({ mustHave: ['TypeScript', 'React'] })
    expect(matchStack(makeProfile(), jd).covered).toEqual(['TypeScript', 'React'])
  })
})

describe('selectProjects', () => {
  it('matches by keyword in a highlight and explains the match', () => {
    const jd = makeJd({ keywords: ['Kafka'] })
    expect(selectProjects(makeProfile(), jd)).toEqual([
      { name: 'Data Pipeline', why: '匹配关键词「Kafka」' }
    ])
  })

  it('matches by keyword in the project name (case-insensitive)', () => {
    const jd = makeJd({ keywords: ['chat'] })
    expect(selectProjects(makeProfile(), jd)).toEqual([
      { name: 'Realtime Chat', why: '匹配关键词「chat」' }
    ])
  })

  it('returns [] when no keyword matches', () => {
    const jd = makeJd({ keywords: ['Rust'] })
    expect(selectProjects(makeProfile(), jd)).toEqual([])
  })

  it('caps the result at 5 projects and preserves order', () => {
    const profile = makeProfile({
      projects: Array.from({ length: 8 }, (_, i) => ({
        name: `Proj ${i} React`,
        highlights: [],
        metrics: []
      }))
    })
    const result = selectProjects(profile, makeJd({ keywords: ['react'] }))
    expect(result).toHaveLength(5)
    expect(result.map((p) => p.name)).toEqual([
      'Proj 0 React',
      'Proj 1 React',
      'Proj 2 React',
      'Proj 3 React',
      'Proj 4 React'
    ])
  })

  it('ignores blank keywords', () => {
    const jd = makeJd({ keywords: ['   '] })
    expect(selectProjects(makeProfile(), jd)).toEqual([])
  })
})

describe('collectMetrics', () => {
  it('flattens metrics across projects preserving order', () => {
    expect(collectMetrics(makeProfile())).toEqual(['10k QPS', '99.9% uptime'])
  })

  it('dedupes repeated metrics keeping first-seen order', () => {
    const profile = makeProfile({
      projects: [
        { name: 'A', highlights: [], metrics: ['x', 'y'] },
        { name: 'B', highlights: [], metrics: ['y', 'z'] }
      ]
    })
    expect(collectMetrics(profile)).toEqual(['x', 'y', 'z'])
  })

  it('returns [] when no project has metrics', () => {
    const profile = makeProfile({
      projects: [{ name: 'A', highlights: [] }]
    })
    expect(collectMetrics(profile)).toEqual([])
  })
})

describe('buildBrief', () => {
  it('sets focusAreas to the covered must-haves', () => {
    expect(buildBrief(makeProfile(), makeJd()).focusAreas).toEqual(['React', 'TypeScript'])
  })

  it('puts missing must-haves into both gaps and risks', () => {
    const jd = makeJd({ mustHave: ['React', 'Go'] })
    const brief = buildBrief(makeProfile(), jd)
    expect(brief.gaps).toEqual(['Go'])
    expect(brief.risks).toEqual(['Go', 'limited Go experience'])
  })

  it('computes deepDives as stack ∩ (mustHave ∪ niceToHave)', () => {
    const profile = makeProfile({ techStack: ['React', 'GraphQL', 'Redis'] })
    const jd = makeJd({ mustHave: ['React'], niceToHave: ['GraphQL'] })
    expect(buildBrief(profile, jd).deepDives).toEqual(['React', 'GraphQL'])
  })

  it('derives likelyFollowUps deterministically from focusAreas', () => {
    expect(buildBrief(makeProfile(), makeJd()).likelyFollowUps).toEqual([
      '深入聊聊 React 的实践',
      '深入聊聊 TypeScript 的实践'
    ])
  })

  it('derives questionsToAsk deterministically from niceToHave and keywords', () => {
    const brief = buildBrief(makeProfile(), makeJd())
    expect(brief.questionsToAsk).toEqual([
      '团队如何使用 GraphQL?',
      'React 在团队中的现状如何?',
      'Kafka 在团队中的现状如何?'
    ])
  })

  it('maps strengths into behavioral STAR prompts', () => {
    expect(buildBrief(makeProfile(), makeJd()).behavioralMaterial).toEqual([
      '准备一个体现「owner mentality」的故事（STAR）'
    ])
  })

  it('fills projectsToTell and keyMetrics from the matchers', () => {
    const brief = buildBrief(makeProfile(), makeJd())
    expect(brief.projectsToTell).toEqual([
      { name: 'Realtime Chat', why: '匹配关键词「React」' },
      { name: 'Data Pipeline', why: '匹配关键词「Kafka」' }
    ])
    expect(brief.keyMetrics).toEqual(['10k QPS', '99.9% uptime'])
  })

  it('produces an empty-but-valid brief for empty inputs (no throw)', () => {
    const brief = buildBrief(EMPTY_PROFILE, EMPTY_JD)
    expect(brief).toEqual({
      focusAreas: [],
      gaps: [],
      projectsToTell: [],
      keyMetrics: [],
      likelyFollowUps: [],
      deepDives: [],
      behavioralMaterial: [],
      questionsToAsk: [],
      risks: []
    })
  })

  it('does not mutate its inputs', () => {
    const profile = makeProfile()
    const jd = makeJd()
    const profileSnapshot = JSON.stringify(profile)
    const jdSnapshot = JSON.stringify(jd)
    buildBrief(profile, jd)
    expect(JSON.stringify(profile)).toBe(profileSnapshot)
    expect(JSON.stringify(jd)).toBe(jdSnapshot)
  })

  it('is deterministic across repeated calls', () => {
    const profile = makeProfile()
    const jd = makeJd()
    expect(buildBrief(profile, jd)).toEqual(buildBrief(profile, jd))
  })
})
