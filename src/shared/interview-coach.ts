import type { TranscriptionLanguageCode } from './languages'

export type InterviewLanguage = TranscriptionLanguageCode

export type InterviewStage =
  | 'idle'
  | 'greeting'
  | 'questioning'
  | 'clarifying'
  | 'thinking'
  | 'answering'
  | 'coding'
  | 'reviewing'
  | 'closing'

export type SpeakerRole = 'interviewer' | 'candidate' | 'unknown'

export interface TranscriptTurn {
  id: string
  speaker: SpeakerRole
  speakerSource: 'provider' | 'heuristic' | 'unknown'
  text: string
  isPartial: boolean
  language: InterviewLanguage
  timestamp: number
}

export interface InterviewSuggestion {
  id: string
  title: string
  body: string
  priority: 'high' | 'medium' | 'low'
}

export interface InterviewCoachState {
  stage: InterviewStage
  stageLabel: string
  language: InterviewLanguage
  confidence: number
  interviewerTurns: number
  candidateTurns: number
  currentSpeaker: SpeakerRole
  suggestions: InterviewSuggestion[]
  turns: TranscriptTurn[]
  summary: string
}

export interface AnalyzeTranscriptInput {
  text: string
  isPartial: boolean
  language: InterviewLanguage
  providerSpeaker?: SpeakerRole
  timestamp?: number
}

const MAX_TURNS = 100

const QUESTION_CUES = [
  '吗',
  '呢',
  '怎么',
  '如何',
  '为什么',
  '为何',
  '什么',
  '哪',
  '是否',
  '能不能',
  '可不可以',
  '说说',
  '说一下',
  '说一说',
  '讲讲',
  '讲一下',
  '介绍',
  '聊聊',
  '解释',
  '描述',
  '分析',
  '举例',
  '举个例子',
  '对比',
  '区别',
  '请问',
  '谈谈',
  '?',
  '？',
  'what',
  'why',
  'how',
  'when',
  'where',
  'which',
  'who',
  'can you',
  'could you',
  'would you',
  'tell me',
  'describe',
  'explain',
  'walk me',
  // Japanese: questions usually end in か/ですか/ますか and often lack a '?'.
  'ですか',
  'ますか',
  'でしょうか',
  'なぜ',
  'どう',
  'どの',
  'どれ',
  'なに',
  '教えて',
  // Korean: question endings 까/나요/가요 and interrogatives.
  '까',
  '나요',
  '가요',
  '습니까',
  '왜',
  '어떻게',
  '무엇',
  '어떤',
  // French interrogatives / phrasing.
  'pourquoi',
  'comment',
  'est-ce que',
  'quel',
  'quelle',
  'pouvez-vous',
  'expliquez',
  'décrivez'
]

/** Heuristic: does this interviewer utterance look like an actual question/ask
   worth answering? Avoids burning tokens on filler ("好的"、"嗯"、过渡语).

   Latin-script cues (English/French) are matched on word boundaries so a
   short cue like "how" doesn't fire on "however" / "who" on "whole" — English
   ASR output is space-delimited, so a statement that merely contains a
   question word no longer triggers an assist. CJK cues and punctuation have no
   word boundaries, so they keep plain substring matching. */
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim()
  if (t.length < 4) return false
  const lower = t.toLowerCase()
  return QUESTION_CUES.some((cue) => {
    // A cue made purely of ASCII letters/spaces is matched on word boundaries.
    if (/^[a-z][a-z\s-]*$/.test(cue)) {
      const escaped = cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`).test(lower)
    }
    // CJK cues / punctuation: plain substring containment.
    return lower.includes(cue)
  })
}

const stageLabels: Record<InterviewStage, string> = {
  idle: '等待开始',
  greeting: '开场寒暄',
  questioning: '面试官提问',
  clarifying: '需求澄清',
  thinking: '思考组织',
  answering: '回答阐述',
  coding: '编码实现',
  reviewing: '复盘追问',
  closing: '收尾总结'
}

const initialState: InterviewCoachState = {
  stage: 'idle',
  stageLabel: stageLabels.idle,
  language: 'auto',
  confidence: 0,
  interviewerTurns: 0,
  candidateTurns: 0,
  currentSpeaker: 'unknown',
  suggestions: [],
  turns: [],
  summary: '开启语音转写后，会根据对话实时判断面试阶段并给出练习建议。'
}

function detectLanguage(text: string, preferred: InterviewLanguage): InterviewLanguage {
  if (preferred !== 'auto') return preferred
  // Check kana/hangul before Han: Japanese text mixes kana with Han characters,
  // so testing Han first would misclassify Japanese sentences as Chinese.
  if (/[\u3040-\u30ff]/.test(text)) return 'ja'
  if (/[\uac00-\ud7af]/.test(text)) return 'ko'
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text)) return 'en'
  return 'auto'
}

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

function inferSpeaker(text: string, providerSpeaker?: SpeakerRole) {
  if (providerSpeaker && providerSpeaker !== 'unknown') {
    return { speaker: providerSpeaker, source: 'provider' as const }
  }

  const interviewerSignals = [
    '请你',
    '你能',
    '能不能',
    '介绍一下',
    '为什么',
    '怎么',
    '复杂度',
    '边界',
    '实现',
    '优化',
    'what',
    'why',
    'how',
    'can you',
    'could you',
    'tell me',
    '?',
    '？'
  ]
  const candidateSignals = [
    '我会',
    '我的思路',
    '首先',
    '然后',
    '这里',
    '我认为',
    'let me',
    'i would',
    'my approach',
    'first',
    'then',
    'so i'
  ]

  if (includesAny(text, interviewerSignals)) {
    return { speaker: 'interviewer' as const, source: 'heuristic' as const }
  }
  if (includesAny(text, candidateSignals)) {
    return { speaker: 'candidate' as const, source: 'heuristic' as const }
  }
  return { speaker: 'unknown' as const, source: 'unknown' as const }
}

function inferStage(text: string, speaker: SpeakerRole, previous: InterviewStage): InterviewStage {
  if (!text.trim()) return previous
  if (includesAny(text, ['你好', 'hello', 'hi', '开始', '自我介绍', 'introduce yourself'])) {
    return 'greeting'
  }
  if (
    includesAny(text, ['澄清', '输入', '输出', '约束', '限制', '边界', 'clarify', 'constraint'])
  ) {
    return 'clarifying'
  }
  if (includesAny(text, ['代码', '实现', '函数', 'class', 'function', 'code', 'implement'])) {
    return 'coding'
  }
  if (
    includesAny(text, ['复杂度', '优化', 'bug', '测试', '用例', 'review', 'optimize', 'complexity'])
  ) {
    return 'reviewing'
  }
  if (includesAny(text, ['结束', '还有什么问题', 'thank you', 'that is all'])) {
    return 'closing'
  }
  if (speaker === 'interviewer') return 'questioning'
  if (speaker === 'candidate') return 'answering'
  return previous === 'idle' ? 'thinking' : previous
}

function suggestionText(language: InterviewLanguage, stage: InterviewStage): InterviewSuggestion[] {
  const zh = language === 'zh' || language === 'auto'
  const copy = (title: string, body: string, priority: InterviewSuggestion['priority']) => ({
    id: `${stage}-${title}`,
    title,
    body,
    priority
  })

  switch (stage) {
    case 'questioning':
      return zh
        ? [
            copy('先复述问题', '用一句话确认目标、输入输出和关键约束，避免直接跳到代码。', 'high'),
            copy('主动澄清边界', '询问数据规模、空输入、重复值、排序/稳定性等边界条件。', 'medium')
          ]
        : [
            copy(
              'Restate the problem',
              'Confirm goal, input/output and constraints before coding.',
              'high'
            ),
            copy(
              'Clarify edge cases',
              'Ask about scale, empty input, duplicates, ordering and stability.',
              'medium'
            )
          ]
    case 'clarifying':
      return zh
        ? [
            copy(
              '沉淀约束',
              '把澄清结果转成算法选择依据，例如是否需要 O(n)、是否能额外空间。',
              'high'
            )
          ]
        : [
            copy(
              'Turn constraints into choices',
              'Map each clarified constraint to algorithm and data-structure choices.',
              'high'
            )
          ]
    case 'answering':
      return zh
        ? [
            copy('结构化表达', '按“思路 → 数据结构 → 复杂度 → 边界”回答，保持简洁。', 'high'),
            copy('给出取舍', '说明为什么不用更简单或更复杂的方案，体现工程判断。', 'medium')
          ]
        : [
            copy(
              'Use a clear structure',
              'Answer with approach, data structures, complexity, then edge cases.',
              'high'
            ),
            copy(
              'Explain trade-offs',
              'Mention why simpler or heavier alternatives are not chosen.',
              'medium'
            )
          ]
    case 'coding':
      return zh
        ? [copy('边写边讲', '同步说明变量含义和循环不变量，关键分支先讲再写。', 'high')]
        : [
            copy(
              'Narrate while coding',
              'Explain variable roles and invariants before key branches.',
              'high'
            )
          ]
    case 'reviewing':
      return zh
        ? [
            copy('主动自测', '先给 2-3 个代表性用例，再讲时间/空间复杂度。', 'high'),
            copy('承认可优化点', '如果有更优方案，说明当前方案为何足够以及升级路径。', 'medium')
          ]
        : [
            copy(
              'Self-test first',
              'Walk through 2-3 representative cases before complexity analysis.',
              'high'
            ),
            copy(
              'Acknowledge upgrades',
              'If a better solution exists, explain why this one is acceptable and how to improve it.',
              'medium'
            )
          ]
    case 'closing':
      return zh
        ? [copy('收尾提问', '准备一个关于团队工程实践或问题约束的简短反问。', 'low')]
        : [
            copy(
              'Close with a question',
              'Prepare one concise question about team practices or constraints.',
              'low'
            )
          ]
    default:
      return zh
        ? [copy('保持练习节奏', '等待新问题时，准备按 STAR/算法四段式组织回答。', 'low')]
        : [
            copy(
              'Keep structure ready',
              'Prepare to answer with STAR or the four-part algorithm structure.',
              'low'
            )
          ]
  }
}

function summarize(
  turns: TranscriptTurn[],
  stage: InterviewStage,
  language: InterviewLanguage
): string {
  const last = turns[turns.length - 1]
  if (!last) return initialState.summary
  if (language === 'en') {
    return `Current phase: ${stageLabels[stage]}. Latest ${last.speaker}: ${last.text.slice(0, 80)}`
  }
  const speaker =
    last.speaker === 'interviewer'
      ? '面试官'
      : last.speaker === 'candidate'
        ? '候选人'
        : '未知说话人'
  return `当前阶段：${stageLabels[stage]}。最新${speaker}内容：${last.text.slice(0, 80)}`
}

export function createInitialInterviewCoachState(): InterviewCoachState {
  return { ...initialState, suggestions: [...initialState.suggestions], turns: [] }
}

export function analyzeTranscriptTurn(
  previousState: InterviewCoachState,
  input: AnalyzeTranscriptInput
): InterviewCoachState {
  const text = input.text.trim()
  if (!text) return previousState

  const language = detectLanguage(text, input.language)
  const { speaker, source } = inferSpeaker(text, input.providerSpeaker)
  const stage = inferStage(text, speaker, previousState.stage)
  const timestamp = input.timestamp ?? Date.now()
  const turn: TranscriptTurn = {
    id: `${timestamp}-${previousState.turns.length}`,
    speaker,
    speakerSource: source,
    text,
    isPartial: input.isPartial,
    language,
    timestamp
  }

  const stableTurns = previousState.turns.filter((item) => !item.isPartial)
  const turns = [...stableTurns, turn].slice(-MAX_TURNS)
  const interviewerTurns = turns.filter(
    (item) => item.speaker === 'interviewer' && !item.isPartial
  ).length
  const candidateTurns = turns.filter(
    (item) => item.speaker === 'candidate' && !item.isPartial
  ).length
  const knownTurns = turns.filter((item) => item.speaker !== 'unknown').length
  const providerTurns = turns.filter((item) => item.speakerSource === 'provider').length

  return {
    stage,
    stageLabel: stageLabels[stage],
    language,
    confidence: turns.length
      ? Math.min(0.98, 0.35 + knownTurns / turns.length / 2 + providerTurns / turns.length / 5)
      : 0,
    interviewerTurns,
    candidateTurns,
    currentSpeaker: speaker,
    suggestions: suggestionText(language, stage),
    turns,
    summary: summarize(turns, stage, language)
  }
}
