/** Pure question-type classifier for the per-question-type workbenches (P2#43).

   Given the captured problem text (from screenshot OCR or the transcript), infer
   which kind of interview question it is so the UI can route to the right
   workbench / tailor the answer scaffold. Heuristic and deterministic: keyword
   scoring with a stable tie-break, no IO, no clock, no randomness.

   This is intentionally conservative — it returns 'unknown' when nothing scores,
   so the caller falls back to the general flow rather than mis-routing. */

export type QuestionType =
  | 'coding'
  | 'system-design'
  | 'sql'
  | 'behavioral'
  | 'debugging'
  | 'unknown'

// Ordered by tie-break priority (earlier wins on an equal score).
const TYPE_ORDER: Exclude<QuestionType, 'unknown'>[] = [
  'coding',
  'system-design',
  'sql',
  'debugging',
  'behavioral'
]

// Lowercased keyword signals per type. Chinese + English so it works across the
// app's languages. Matched as substrings against the normalized text.
const SIGNALS: Record<Exclude<QuestionType, 'unknown'>, string[]> = {
  coding: [
    'leetcode',
    'time complexity',
    'complexity',
    'algorithm',
    'array',
    'linked list',
    'binary tree',
    'implement a function',
    'return the',
    '算法',
    '复杂度',
    '数组',
    '链表',
    '二叉树',
    '实现一个函数',
    '时间复杂度'
  ],
  'system-design': [
    'design a',
    'system design',
    'scalable',
    'throughput',
    'load balanc',
    'sharding',
    'high availability',
    'architecture',
    '设计一个',
    '系统设计',
    '高可用',
    '可扩展',
    '架构',
    '吞吐'
  ],
  sql: [
    'select ',
    'sql',
    'join',
    'group by',
    'query the',
    'database table',
    '数据库',
    '查询',
    '表中',
    '写一条 sql'
  ],
  debugging: [
    'bug',
    'why does this',
    'fix the',
    'error',
    'stack trace',
    'not working',
    'debug',
    '报错',
    '修复',
    '为什么会',
    '调试',
    '哪里有问题'
  ],
  behavioral: [
    'tell me about a time',
    'describe a situation',
    'why do you want',
    'your strength',
    'your weakness',
    'conflict',
    'teamwork',
    '讲一次',
    '介绍一下你',
    '为什么想',
    '优点',
    '缺点',
    '团队',
    '冲突'
  ]
}

export interface QuestionTypeScore {
  type: QuestionType
  score: number
}

/** Score each type by how many of its keyword signals appear in the text.
   Returns all non-zero scores sorted by score desc, then TYPE_ORDER. */
export function scoreQuestionTypes(text: string): QuestionTypeScore[] {
  const hay = text.toLowerCase()
  const scores = TYPE_ORDER.map((type) => ({
    type: type as QuestionType,
    score: SIGNALS[type].reduce((n, kw) => (hay.includes(kw) ? n + 1 : n), 0)
  })).filter((s) => s.score > 0)
  scores.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return (
      TYPE_ORDER.indexOf(a.type as Exclude<QuestionType, 'unknown'>) -
      TYPE_ORDER.indexOf(b.type as Exclude<QuestionType, 'unknown'>)
    )
  })
  return scores
}

/** The single best-guess question type, or 'unknown' when nothing matches. */
export function classifyQuestion(text: string): QuestionType {
  if (!text.trim()) return 'unknown'
  const scored = scoreQuestionTypes(text)
  return scored.length > 0 ? scored[0].type : 'unknown'
}
