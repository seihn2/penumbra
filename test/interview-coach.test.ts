import { describe, expect, it } from 'vitest'
import {
  analyzeTranscriptTurn,
  createInitialInterviewCoachState,
  looksLikeQuestion
} from '../src/shared/interview-coach'

describe('looksLikeQuestion', () => {
  it('detects Chinese questions', () => {
    expect(looksLikeQuestion('你能介绍一下你的项目吗')).toBe(true)
    expect(looksLikeQuestion('说说你对并发的理解')).toBe(true)
    expect(looksLikeQuestion('这道题的时间复杂度是多少？')).toBe(true)
  })

  it('detects Chinese imperative-style asks (no question mark)', () => {
    // Common interviewer phrasings that aren't grammatical questions but clearly
    // request an answer — these previously slipped through and missed an assist.
    expect(looksLikeQuestion('说一下你做过的最复杂的项目')).toBe(true)
    expect(looksLikeQuestion('讲一下你对 GC 的理解')).toBe(true)
    expect(looksLikeQuestion('描述一下你的系统架构')).toBe(true)
    expect(looksLikeQuestion('分析一下这段代码的瓶颈')).toBe(true)
    expect(looksLikeQuestion('举个例子说明一下')).toBe(true)
    expect(looksLikeQuestion('对比一下这两种方案')).toBe(true)
    expect(looksLikeQuestion('说说它们的区别')).toBe(true)
  })

  it('detects English questions', () => {
    expect(looksLikeQuestion('Can you walk me through your approach')).toBe(true)
    expect(looksLikeQuestion('Why did you choose this data structure?')).toBe(true)
  })

  it('detects Japanese questions without a question mark', () => {
    expect(looksLikeQuestion('このアルゴリズムの計算量はどうですか')).toBe(true)
    expect(looksLikeQuestion('プロジェクトについて教えてください')).toBe(true)
  })

  it('detects Korean questions', () => {
    expect(looksLikeQuestion('이 문제를 어떻게 풀까요')).toBe(true)
    expect(looksLikeQuestion('프로젝트 경험을 설명해 주시겠습니까')).toBe(true)
  })

  it('detects French questions', () => {
    expect(looksLikeQuestion('Pouvez-vous expliquer votre approche')).toBe(true)
    expect(looksLikeQuestion('Pourquoi avez-vous choisi cette structure')).toBe(true)
  })

  it('rejects filler / transition lines', () => {
    expect(looksLikeQuestion('好的')).toBe(false)
    expect(looksLikeQuestion('嗯嗯')).toBe(false)
    expect(looksLikeQuestion('OK')).toBe(false)
  })

  it('does not fire on statements that merely contain a question word', () => {
    // "however" contains "how", "whole" contains "who", "whenever" contains
    // "when" — word-boundary matching must not treat these as questions.
    expect(looksLikeQuestion('However, that approach also works fine')).toBe(false)
    expect(looksLikeQuestion('The whole system is well designed')).toBe(false)
    expect(looksLikeQuestion('Whenever you feel ready, start coding')).toBe(false)
  })

  it('still fires on real English questions with standalone cue words', () => {
    expect(looksLikeQuestion('How would you optimize this')).toBe(true)
    expect(looksLikeQuestion('Who owns this service')).toBe(true)
    expect(looksLikeQuestion('When does it run')).toBe(true)
  })
})

describe('createInitialInterviewCoachState', () => {
  it('starts idle with no turns', () => {
    const state = createInitialInterviewCoachState()
    expect(state.stage).toBe('idle')
    expect(state.turns).toEqual([])
    expect(state.confidence).toBe(0)
  })

  it('returns an independent turns array each call', () => {
    const a = createInitialInterviewCoachState()
    const b = createInitialInterviewCoachState()
    expect(a.turns).not.toBe(b.turns)
  })
})

describe('analyzeTranscriptTurn', () => {
  const base = createInitialInterviewCoachState()

  it('ignores blank text', () => {
    const next = analyzeTranscriptTurn(base, { text: '   ', isPartial: false, language: 'auto' })
    expect(next).toBe(base)
  })

  it('detects Chinese language automatically', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '请你介绍一下你的项目经历',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.language).toBe('zh')
  })

  it('detects Japanese (kana + Han) as ja, not zh', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '私の経験を説明します',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.language).toBe('ja')
  })

  it('honors an explicit non-auto language', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '请你介绍一下',
      isPartial: false,
      language: 'en',
      timestamp: 1000
    })
    expect(next.language).toBe('en')
  })

  it('infers interviewer from questioning signals', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '你能介绍一下这个算法的复杂度吗？',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.currentSpeaker).toBe('interviewer')
    expect(next.interviewerTurns).toBe(1)
  })

  it('infers candidate from answering signals', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '我的思路是首先用哈希表存储',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.currentSpeaker).toBe('candidate')
    expect(next.candidateTurns).toBe(1)
  })

  it('trusts a provider-supplied speaker label over heuristics', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '这里我觉得可以优化',
      isPartial: false,
      language: 'auto',
      providerSpeaker: 'interviewer',
      timestamp: 1000
    })
    expect(next.currentSpeaker).toBe('interviewer')
    expect(next.turns[0].speakerSource).toBe('provider')
  })

  it('moves to coding stage on implementation keywords', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '我们来实现这个 function',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.stage).toBe('coding')
  })

  it('replaces a prior partial turn instead of accumulating it', () => {
    const partial = analyzeTranscriptTurn(base, {
      text: '我的思路是',
      isPartial: true,
      language: 'auto',
      timestamp: 1000
    })
    expect(partial.turns).toHaveLength(1)

    const finalized = analyzeTranscriptTurn(partial, {
      text: '我的思路是用双指针',
      isPartial: false,
      language: 'auto',
      timestamp: 1100
    })
    expect(finalized.turns).toHaveLength(1)
    expect(finalized.turns[0].isPartial).toBe(false)
  })

  it('caps history at 100 stable turns', () => {
    let state = createInitialInterviewCoachState()
    for (let i = 0; i < 120; i++) {
      state = analyzeTranscriptTurn(state, {
        text: `第 ${i} 句话首先`,
        isPartial: false,
        language: 'auto',
        timestamp: 1000 + i
      })
    }
    expect(state.turns.length).toBeLessThanOrEqual(100)
  })

  it('gives provider-labeled turns higher confidence than heuristics', () => {
    const heuristic = analyzeTranscriptTurn(base, {
      text: '你能讲讲吗？',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    const provider = analyzeTranscriptTurn(base, {
      text: '你能讲讲吗？',
      isPartial: false,
      language: 'auto',
      providerSpeaker: 'interviewer',
      timestamp: 1000
    })
    expect(provider.confidence).toBeGreaterThan(heuristic.confidence)
  })

  it('produces stage-appropriate suggestions', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '你能介绍一下吗？',
      isPartial: false,
      language: 'zh',
      timestamp: 1000
    })
    expect(next.suggestions.length).toBeGreaterThan(0)
    expect(next.suggestions[0].priority).toBe('high')
  })

  it('prefers provider speaker over a conflicting heuristic', () => {
    // Text reads like an interviewer ask ("你能…吗？"), but the provider says
    // it came from the candidate's microphone — the provider label must win.
    const next = analyzeTranscriptTurn(base, {
      text: '你能再说一遍这个约束吗？',
      isPartial: false,
      language: 'auto',
      providerSpeaker: 'candidate',
      timestamp: 1000
    })
    expect(next.currentSpeaker).toBe('candidate')
    expect(next.turns[0].speakerSource).toBe('provider')
    expect(next.candidateTurns).toBe(1)
    expect(next.interviewerTurns).toBe(0)
  })

  it('ignores an unknown provider speaker and falls back to heuristics', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '我的思路是首先排序',
      isPartial: false,
      language: 'auto',
      providerSpeaker: 'unknown',
      timestamp: 1000
    })
    expect(next.currentSpeaker).toBe('candidate')
    expect(next.turns[0].speakerSource).toBe('heuristic')
  })

  it('marks an unrecognized utterance as unknown', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '今天天气不错呀',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.currentSpeaker).toBe('unknown')
    expect(next.turns[0].speakerSource).toBe('unknown')
    expect(next.interviewerTurns).toBe(0)
    expect(next.candidateTurns).toBe(0)
  })

  it('infers the greeting stage from opening keywords', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '你好，先做个自我介绍吧',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.stage).toBe('greeting')
  })

  it('infers the clarifying stage from constraint keywords', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '我想澄清一下输入的约束条件',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.stage).toBe('clarifying')
  })

  it('infers the reviewing stage from complexity keywords', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '我们来看看时间复杂度还能不能优化',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.stage).toBe('reviewing')
  })

  it('infers the closing stage from wrap-up keywords', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '差不多了，你还有什么问题想问我吗',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.stage).toBe('closing')
  })

  it('keeps stage labels in sync with the inferred stage', () => {
    const next = analyzeTranscriptTurn(base, {
      text: '你好，开始吧',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    expect(next.stageLabel).toBe('开场寒暄')
  })

  it('raises confidence as the share of known turns grows', () => {
    // Start with an unrecognized (unknown) turn, then add a clearly-attributed
    // one: knownTurns/total climbs from 0/1 to 1/2, so confidence must rise.
    const first = analyzeTranscriptTurn(base, {
      text: '今天天气不错呀',
      isPartial: false,
      language: 'auto',
      timestamp: 1000
    })
    const second = analyzeTranscriptTurn(first, {
      text: '我的思路是首先排序',
      isPartial: false,
      language: 'auto',
      timestamp: 1100
    })
    expect(second.confidence).toBeGreaterThan(first.confidence)
  })

  it('does not count a partial turn toward stable speaker tallies', () => {
    const partial = analyzeTranscriptTurn(base, {
      text: '你能介绍一下这个算法吗？',
      isPartial: true,
      language: 'auto',
      providerSpeaker: 'interviewer',
      timestamp: 1000
    })
    // The turn is present in the timeline but excluded from the stable count.
    expect(partial.turns).toHaveLength(1)
    expect(partial.turns[0].isPartial).toBe(true)
    expect(partial.interviewerTurns).toBe(0)
  })

  it('counts a turn only once it is finalized after being partial', () => {
    const partial = analyzeTranscriptTurn(base, {
      text: '我的思路是',
      isPartial: true,
      language: 'auto',
      providerSpeaker: 'candidate',
      timestamp: 1000
    })
    expect(partial.candidateTurns).toBe(0)

    const finalized = analyzeTranscriptTurn(partial, {
      text: '我的思路是用双指针扫描',
      isPartial: false,
      language: 'auto',
      providerSpeaker: 'candidate',
      timestamp: 1100
    })
    expect(finalized.turns).toHaveLength(1)
    expect(finalized.candidateTurns).toBe(1)
  })
})
