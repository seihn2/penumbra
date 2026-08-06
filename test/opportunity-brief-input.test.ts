import { describe, expect, it } from 'vitest'
import {
  parseJobDescription,
  profileToCandidate,
  splitTerms
} from '../src/shared/opportunity-brief-input'
import { buildBrief } from '../src/shared/opportunity-brief'

describe('splitTerms', () => {
  it('splits on commas, newlines, and Chinese separators', () => {
    expect(splitTerms('React, Vue\nNode、Go；Rust')).toEqual(['React', 'Vue', 'Node', 'Go', 'Rust'])
  })

  it('strips list markers', () => {
    expect(splitTerms('- React\n* Vue\n1. Node')).toEqual(['React', 'Vue', 'Node'])
  })

  it('drops empty items and trims', () => {
    expect(splitTerms('  React ,, \n , Vue ')).toEqual(['React', 'Vue'])
  })

  it('returns [] for empty input', () => {
    expect(splitTerms('')).toEqual([])
    expect(splitTerms('   ')).toEqual([])
  })
})

describe('profileToCandidate', () => {
  it('parses tech stack and strengths/weaknesses', () => {
    const c = profileToCandidate({
      techStack: 'React, TypeScript',
      projects: '',
      highlights: '沟通能力强, 主动',
      avoid: '英语口语'
    })
    expect(c.techStack).toEqual(['React', 'TypeScript'])
    expect(c.strengths).toEqual(['沟通能力强', '主动'])
    expect(c.weaknesses).toEqual(['英语口语'])
  })

  it('parses one project per line with name and highlights', () => {
    const c = profileToCandidate({
      techStack: '',
      projects: '订单系统: 重构架构; QPS 提升 3x\n数据平台 - 实时计算',
      highlights: '',
      avoid: ''
    })
    expect(c.projects).toEqual([
      { name: '订单系统', highlights: ['重构架构', 'QPS 提升 3x'], metrics: ['QPS 提升 3x'] },
      { name: '数据平台', highlights: ['实时计算'] }
    ])
  })

  it('treats a project line with no separator as just a name', () => {
    const c = profileToCandidate({
      techStack: '',
      projects: '一个内部工具',
      highlights: '',
      avoid: ''
    })
    expect(c.projects).toEqual([{ name: '一个内部工具', highlights: [] }])
  })

  it('ignores blank project lines', () => {
    const c = profileToCandidate({ techStack: '', projects: '\n\n  \n', highlights: '', avoid: '' })
    expect(c.projects).toEqual([])
  })
})

describe('parseJobDescription', () => {
  it('parses and trims all fields', () => {
    const jd = parseJobDescription({
      title: '  高级前端  ',
      company: ' Acme ',
      mustHave: 'React, TypeScript',
      niceToHave: 'GraphQL',
      keywords: '性能优化、可视化'
    })
    expect(jd).toEqual({
      title: '高级前端',
      company: 'Acme',
      mustHave: ['React', 'TypeScript'],
      niceToHave: ['GraphQL'],
      keywords: ['性能优化', '可视化']
    })
  })
})

describe('end-to-end into buildBrief', () => {
  it('produces a coherent brief from freeform inputs', () => {
    const candidate = profileToCandidate({
      techStack: 'React, TypeScript, Node',
      projects: '可视化平台: 图表渲染; 首屏 1.2s',
      highlights: '主动推进',
      avoid: '系统设计经验少'
    })
    const jd = parseJobDescription({
      title: '前端',
      company: 'Acme',
      mustHave: 'React, Go',
      niceToHave: 'GraphQL',
      keywords: '可视化'
    })
    const brief = buildBrief(candidate, jd)
    expect(brief.focusAreas).toEqual(['React'])
    expect(brief.gaps).toEqual(['Go'])
    expect(brief.projectsToTell).toEqual([{ name: '可视化平台', why: '匹配关键词「可视化」' }])
    expect(brief.keyMetrics).toEqual(['首屏 1.2s'])
    expect(brief.risks).toEqual(['Go', '系统设计经验少'])
  })
})
