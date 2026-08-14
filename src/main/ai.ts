import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateText, streamText, type ModelMessage } from 'ai'
import { settings } from './settings'
import { promptPresetInstruction, isPromptPresetId } from '../shared/prompt-presets'
import { GENERAL_SYSTEM_PROMPT, isAppMode } from '../shared/app-modes'
import {
  DISTILL_SYSTEM_PROMPT,
  buildDistillationPrompt,
  parseMemoryCandidates,
  type MemoryCandidate,
  type MemoryProfile
} from '../shared/memory-profile'
import { detectLanguage } from '../shared/language-contract'
import { memoryForSending } from './profile-auth'
import { extractModelIds } from '../shared/model-list'
import { createModelListRequest } from '../shared/model-list-request'
import { buildInterviewKnowledgePrompt } from './services/knowledge-retrieval-service'
import { runWithAnswerModel, streamWithAnswerModel } from './answer-model'
import { createAnswerConnectionProbeRequest } from '../shared/answer-connection-probe'

/** Instruct the model to answer in the SAME language as the given text (the
   interviewer's question / recent conversation), instead of hardcoding Chinese.
   Fixes Assist/summary/Coach always replying in Chinese to an English or
   Japanese interview (P1#29). Falls back to Chinese only when undetectable. */
function outputLanguageDirective(sampleText: string): string {
  const lang = detectLanguage(sampleText)
  const name: Record<string, string> = {
    zh: '中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    ru: 'Русский'
  }
  return name[lang] ?? '中文'
}

export const PROMPT_SYSTEM = readFileSync(join(import.meta.dirname, 'prompts.md'), 'utf-8').trim()

/** Build the system prompt. Priority: custom prompt overrides everything;
   otherwise the mode's base prompt (algorithm = prompts.md + coding language,
   general = plain assistant) plus the output-style preset and user memory. */
function buildSystemPrompt(extra = ''): string {
  const memory = memoryForSending()
  const memoryBlock = memory
    ? `\n\n以下是候选人提供的背景资料（简历/项目/偏好等），请在解答时参考，使回答更贴合其背景：\n${memory}`
    : ''
  if (settings.customPrompt) return settings.customPrompt + memoryBlock

  const preset = isPromptPresetId(settings.promptPreset) ? settings.promptPreset : 'default'
  const mode = isAppMode(settings.appMode) ? settings.appMode : 'algorithm'
  const base =
    mode === 'general'
      ? GENERAL_SYSTEM_PROMPT
      : PROMPT_SYSTEM + `\n使用编程语言：${settings.codeLanguage} 解答。`

  return base + promptPresetInstruction[preset] + memoryBlock + extra
}

export function getSolutionStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  return streamWithAnswerModel(
    (model) =>
      streamText({
        model,
        system: buildSystemPrompt(),
        messages,
        abortSignal,
        onError: (err) => {
          throw err.error ?? err
        }
      }).textStream
  )
}

export function getFollowUpStream(
  messages: ModelMessage[],
  userQuestion: string,
  abortSignal?: AbortSignal
) {
  // Add the user's follow-up question to the conversation
  const updatedMessages: ModelMessage[] = [
    ...messages,
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: userQuestion
        }
      ]
    }
  ]

  return streamWithAnswerModel(
    (model) =>
      streamText({
        model,
        system: buildSystemPrompt(),
        messages: updatedMessages,
        abortSignal,
        onError: (err) => {
          throw err.error ?? err
        }
      }).textStream
  )
}

export function getGeneralStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  return streamWithAnswerModel(
    (model) =>
      streamText({
        model,
        system: buildSystemPrompt(
          '\n\n注意：如果有多张截图，请结合所有截图内容进行完整分析，不要遗漏任何部分。'
        ),
        messages,
        abortSignal,
        onError: (err) => {
          throw err.error ?? err
        }
      }).textStream
  )
}

export async function translateTranscriptText(
  text: string,
  targetLanguage: string,
  abortSignal?: AbortSignal
) {
  if (!settings.apiKey || !text.trim()) return ''

  const { text: translatedText } = await runWithAnswerModel((model) =>
    generateText({
      model,
      system:
        'You are a concise real-time interpreter for interview practice. Translate faithfully, keep technical terms accurate, and return only the translation.',
      prompt: `Translate the following transcript into ${targetLanguage}.\n\n${text}`,
      abortSignal
    })
  )

  return translatedText.trim()
}

/** System prompt for live interview answer-point assist. */
const ASSIST_SYSTEM_PROMPT = `你是面试实时助手。面试官刚提出一个问题，请给候选人能"当场照着念"的结构化答题卡。

先在心里判断题型，再按对应结构给要点（不要写出"题型："这类标签，直接给要点）：
- 行为题（讲经历/如何处理某情况）：用 STAR——情境、任务、行动、结果，每点对应一句可以直接说出口的话。
- 系统设计题：先澄清需求与规模估算，再给核心组件/数据流，再点关键取舍（如一致性 vs 可用性、成本），最后提瓶颈与扩展方向。
- 算法题：先说思路（关键数据结构/做法），再给时间与空间复杂度，再点边界与易错点。
- 概念题（什么是X/对比/原理）：一句话定义，再给关键点或对比，最后给适用场景或一个例子。

输出必须严格使用下面的轻量协议，方括号标记必须保留英文，内容使用指定输出语言：
[TYPE] project|behavioral|system-design|algorithm|concept|general
[OPENING]
一句可以直接开口说的话，先给结论或定位，不要超过 45 个汉字或同等长度。
[PATH]
- 3-5 步回答路线，每步只说一个重点，按实际开口顺序排列。
[EVIDENCE]
- 只有候选人背景或上下文中有真实依据时才写；列可用于佐证的项目细节、指标或取舍。没有依据就保留标记但不写内容，禁止编造。
[FOLLOW_UP]
- 1-3 个面试官最可能继续追问的问题或需要提前准备的细节。
[AVOID]
- 0-2 个容易自相矛盾、夸大或答偏的点；没有就保留标记但不写内容。

其它要求：
- 口语化、短句、可直接念出口，不要输出协议之外的前言、标题或总结。
- 项目题优先讲“我负责什么、为什么这么做、源码或数据流怎么走、结果和取舍”，不要只背概念。
- 用户确认过的回答口径优先于通用答案；真实项目事实优先于理想化方案。若实际实现和更优方案不同，要明确区分“当时实际做法”和“如果重做会怎么改”。`

/** Streaming interview assist — yields answer points as they are produced so
   the candidate sees the first point within ~1s instead of waiting for the
   whole block. */
export function streamInterviewAssist(
  question: string,
  context: string,
  abortSignal?: AbortSignal
) {
  return (async function* () {
    // Tailor answer points to the candidate's background when available, so the
    // assist can reference their real projects/experience instead of generics.
    const memory = memoryForSending()
    const projectKnowledge = await buildInterviewKnowledgePrompt(question, abortSignal)
    const langLine = `\n\n输出语言：请用与面试官问题相同的语言作答（本次为 ${outputLanguageDirective(question)}），不要固定用中文。`
    const system = [
      ASSIST_SYSTEM_PROMPT,
      langLine,
      memory ? `候选人背景（可结合其经历举例，但不要编造）：\n${memory}` : '',
      projectKnowledge
    ]
      .filter(Boolean)
      .join('\n\n')
    const textStream = streamWithAnswerModel(
      (model) =>
        streamText({
          model,
          system,
          prompt: context
            ? `最近对话：\n${context}\n\n面试官最新问题：${question}`
            : `面试官问题：${question}`,
          abortSignal,
          onError: (err) => {
            throw err.error ?? err
          }
        }).textStream
    )
    for await (const chunk of textStream) yield chunk
  })()
}

const PROACTIVE_SYSTEM_PROMPT = `你是面试的"实时副驾"。没有人明确提问，你要根据当前对话的走向（vibe），主动给候选人此刻最有用的提示，帮 ta 接下来说得更好、更有料。

请综合判断现在聊到哪、面试官在意什么，给出最多 4 条、可直接照着说或马上用上的提示。每条以"- "开头，单行、口语化、短句。可在以下角度里挑选当前最相关的（不要全部都给，只给此刻有价值的）：
- 结合候选人简历里的真实项目/经历：提示 ta 此刻可以主动展开哪个项目细节、数据或成果来呼应当前话题（不要编造）。
- 相关的 SOTA 模型/算法/技术点：如果当前话题涉及某领域，补充一两个值得提到的前沿做法或关键技术名词，帮 ta 显得有深度。
- 当前若隐含一个问题，给简短的回答要点。
- 可以反问面试官的好问题或澄清点，体现思考。
- 提醒可深入或没说清的点。

输出要求：只输出要点本身，不要前言/标题/总结；中文；如果当前对话信息太少、暂时没有有价值的提示，就只输出一个"-"开头的轻提示让 ta 继续即可。`

/** Streaming proactive "vibe" assist — no explicit question; reads the recent
   conversation drift + résumé and surfaces what's most useful to say now. */
export function streamProactiveAssist(context: string, abortSignal?: AbortSignal) {
  const memory = memoryForSending()
  const langLine = `\n\n输出语言：请用与最近对话相同的语言（本次为 ${outputLanguageDirective(context)}），不要固定用中文。`
  const system = memory
    ? `${PROACTIVE_SYSTEM_PROMPT}${langLine}\n\n候选人简历/背景（务必结合，但不要编造没有的内容）：\n${memory}`
    : `${PROACTIVE_SYSTEM_PROMPT}${langLine}`
  return streamWithAnswerModel(
    (model) =>
      streamText({
        model,
        system,
        prompt: `这是最近的面试对话，请据此给出此刻最有用的主动提示：\n${context}`,
        abortSignal,
        onError: (err) => {
          throw err.error ?? err
        }
      }).textStream
  )
}

/** Summarize the conversation so far into a short topic-oriented digest. */
export async function summarizeConversation(transcript: string): Promise<string> {
  if (!settings.apiKey || !transcript.trim()) return ''

  const { text } = await runWithAnswerModel((model) =>
    generateText({
      model,
      system: `你是面试记录助手。请把目前的面试对话按话题归纳为简短摘要，帮助候选人随时回看并预判走向。
输出语言：请用与对话相同的语言（本次为 ${outputLanguageDirective(transcript)}），不要固定用中文。
要求：
- 先列已覆盖的话题/问题（每条以"- "开头，一句话），如有则点出当前正在讨论的话题。
- 再用"面试官关注重点："开头，结合已聊内容推断面试官在意的方向（如深度、权衡、落地细节、规模）。
- 最后用"可能追问："开头，预测 1-3 个最可能的追问点，每条以"- "开头一句话。
只输出摘要本身，不要前言。`,
      prompt: transcript,
      abortSignal: AbortSignal.timeout(20000)
    })
  )
  return text.trim()
}

/** Generate the NEXT mock-interview question via the AI interviewer. Returns ''
   on any failure so the caller can fall back to the deterministic bank. `track`
   / `difficulty` steer the question; `history` is the recent Q&A so the AI can
   drill down instead of repeating. `isFollowUp` asks it to probe the last
   answer. Personalized with the candidate's memory when available. */
export async function generateMockQuestion(input: {
  track: string
  difficulty: string
  history: string
  isFollowUp: boolean
}): Promise<string> {
  if (!settings.apiKey) return ''
  try {
    const memory = memoryForSending()
    const kind = input.isFollowUp ? '追问（针对候选人上一个回答深入）' : '一个新的主问题'
    const system = `你是一位资深技术面试官，正在进行${input.track}方向、难度为「${input.difficulty}」的模拟面试。请只输出${kind}，一句话，口语化、直接提问，不要解释、不要前言、不要给答案。${
      memory ? `\n\n候选人背景（可据此设计更贴合的问题，但不要编造）：\n${memory}` : ''
    }`
    const { text } = await runWithAnswerModel((model) =>
      generateText({
        model,
        system,
        prompt: input.history
          ? `目前的面试对话：\n${input.history}\n\n请给出下一个问题。`
          : '请给出第一个问题。',
        abortSignal: AbortSignal.timeout(20000)
      })
    )
    return text.trim()
  } catch (error) {
    console.error('Failed to generate mock question:', error)
    return ''
  }
}

/** Score a mock-interview answer on three 0-5 sub-scores plus one line of
   feedback. Returns null on any failure (the caller then simply skips scoring).
   The numeric clamping/averaging lives in the pure mock-interview.scoreAnswer. */
export async function scoreMockAnswer(input: {
  question: string
  answer: string
}): Promise<{ structure: number; evidence: number; clarity: number; feedback: string } | null> {
  if (!settings.apiKey || !input.answer.trim()) return null
  try {
    const { text } = await runWithAnswerModel((model) =>
      generateText({
        model,
        system: `你是面试评分助手。请给候选人的回答打分，从三个维度各打 0-5 分整数：structure（结构/条理）、evidence（论据/细节/数据）、clarity（表达清晰度）。再给一句中文改进建议。
只输出一个 JSON 对象，形如 {"structure":4,"evidence":3,"clarity":5,"feedback":"..."}，不要 markdown、不要多余文字。`,
        prompt: `问题：${input.question}\n\n候选人回答：${input.answer}`,
        abortSignal: AbortSignal.timeout(20000)
      })
    )
    const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return {
      structure: num(parsed.structure),
      evidence: num(parsed.evidence),
      clarity: num(parsed.clarity),
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : ''
    }
  } catch (error) {
    console.error('Failed to score mock answer:', error)
    return null
  }
}

/** Break an AI answer into provenance-tagged claims (P0 answer-provenance).
   Returns the raw model JSON string; the caller parses it with the pure
   answer-provenance.parseClaims so facts / assumptions / inferences render
   separately. Returns '' on any failure (caller shows nothing). The model
   declares each claim's own provenance — nothing is fabricated here. */
export async function tagAnswerProvenance(answer: string): Promise<string> {
  if (!settings.apiKey || !answer.trim()) return ''
  try {
    const { text } = await runWithAnswerModel((model) =>
      generateText({
        model,
        system: `你是回答可信度分析助手。请把下面这段回答拆成若干条"论断"，并标注每条的来源类别（provenance），帮助读者区分事实与推测。
provenance 只能取以下之一：
- problem-text：题目/材料原文
- user-constraint：用户明确确认的约束
- known-fact：公认且可核查的事实
- assumption：模型做出的合理假设
- ai-inference：模型自己的推理
- unconfirmed：断言但仍需确认
只输出一个 JSON 数组，每个元素形如 {"text":"…","provenance":"…"}，不要 markdown、不要多余文字。text 用与原回答相同的语言。`,
        prompt: answer,
        abortSignal: AbortSignal.timeout(20000)
      })
    )
    return text.trim()
  } catch (error) {
    console.error('Failed to tag answer provenance:', error)
    return ''
  }
}

/** Distill NEW durable facts about the candidate from the recent conversation
   into structured memory candidates. Returns [] on any failure — distillation
   is best-effort and never blocks the session. The caller surfaces the result
   for explicit user confirmation before anything is written to a profile. */
export async function distillMemoryCandidates(
  context: string,
  activeProfile: MemoryProfile
): Promise<MemoryCandidate[]> {
  if (!settings.apiKey || !context.trim()) return []
  try {
    const { text } = await runWithAnswerModel((model) =>
      generateText({
        model,
        system: DISTILL_SYSTEM_PROMPT,
        prompt: buildDistillationPrompt(context, activeProfile),
        abortSignal: AbortSignal.timeout(20000)
      })
    )
    return parseMemoryCandidates(text)
  } catch (error) {
    console.error('Failed to distill memory candidates:', error)
    return []
  }
}

export interface AiConnectionResult {
  ok: boolean
  error?: string
}

export interface ModelListResult {
  ok: boolean
  models?: string[]
  error?: string
}

/** Fetch the platform's available models with the authentication headers used
   by the selected answer protocol. */
export async function fetchAvailableModels(): Promise<ModelListResult> {
  if (!settings.apiKey) return { ok: false, error: 'no api key' }

  const request = createModelListRequest(
    settings.apiBaseURL,
    settings.apiKey,
    settings.answerApiProtocol
  )
  try {
    const res = await fetch(request.url, {
      headers: request.headers,
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? 'auth' : `http ${res.status}` }
    }
    const models = extractModelIds(await res.json())
    return { ok: true, models }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'timeout'
          : error.message
        : 'request failed'
    return { ok: false, error: message }
  }
}

/** One-shot connectivity check for the AI model: send a tiny generateText
   request with the configured baseURL/key/model. Lets users confirm their AI
   config before relying on it for solutions. */
export async function testAiConnection(): Promise<AiConnectionResult> {
  if (!settings.apiKey) return { ok: false, error: 'no api key' }

  try {
    await runWithAnswerModel((model) =>
      generateText({
        model,
        ...createAnswerConnectionProbeRequest(),
        // Bound the probe so a wrong/unreachable baseURL can't hang the button.
        abortSignal: AbortSignal.timeout(10000)
      })
    )
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'timeout'
          : error.message
        : 'request failed'
    return { ok: false, error: message }
  }
}

// A 1x1 transparent PNG — enough to prove the model accepts an image part.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

export interface VisionStreamProbeResult {
  ok: boolean
  /** Whether at least one streamed chunk arrived (proves streaming, not just a
     buffered response). */
  streamed: boolean
  /** Latency to the first streamed chunk, in ms, when ok. */
  latencyMs?: number
  error?: string
}

/** Probe that the configured model genuinely supports BOTH image input and
   streaming — not just a text ping. Sends a tiny image with a one-word prompt
   through streamText and confirms a chunk actually streams back, so users find
   out before the interview if their model is text-only or non-streaming. */
export async function probeVisionStream(): Promise<VisionStreamProbeResult> {
  if (!settings.apiKey) return { ok: false, streamed: false, error: 'no api key' }

  const startedAt = Date.now()

  try {
    const textStream = streamWithAnswerModel(
      (model) =>
        streamText({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Reply with the single word: ok' },
                { type: 'image', image: TINY_PNG_BASE64 }
              ]
            }
          ],
          maxOutputTokens: 8,
          abortSignal: AbortSignal.timeout(15000),
          onError: (err) => {
            throw err.error ?? err
          }
        }).textStream
    )

    let streamed = false
    let latencyMs: number | undefined
    for await (const chunk of textStream) {
      if (chunk.length > 0 && !streamed) {
        streamed = true
        latencyMs = Date.now() - startedAt
      }
    }
    return { ok: true, streamed, latencyMs }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'timeout'
          : error.message
        : 'request failed'
    return { ok: false, streamed: false, error: message }
  }
}
