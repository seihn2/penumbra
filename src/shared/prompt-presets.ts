/** Output style presets that adjust the system prompt for solution generation.
   Each preset contributes an extra instruction appended to the base prompt.
   `customPrompt` (when set) still overrides everything. */
export type PromptPresetId = 'default' | 'concise' | 'codeOnly' | 'interview'

export const PROMPT_PRESET_IDS: PromptPresetId[] = ['default', 'concise', 'codeOnly', 'interview']

export const DEFAULT_PROMPT_PRESET: PromptPresetId = 'default'

/** Extra system-prompt instruction per preset (English; appended to base). */
export const promptPresetInstruction: Record<PromptPresetId, string> = {
  default: '',
  concise:
    '\n\n请尽量简洁：用最少的文字给出核心思路与可运行代码，省略冗长铺垫，不展开多种备选方案（除非确有必要）。',
  codeOnly:
    '\n\n只输出可直接运行的完整代码（含必要注释），代码块用 Markdown 包裹并标注语言；除非必要，不要在代码块外添加解释文字。',
  interview:
    '\n\n以面试讲解的口吻作答：先口头化地说清思路与权衡，再给代码，并补充可能的追问点、复杂度分析和边界情况，帮助候选人在面试中讲解。'
}

export function isPromptPresetId(value: unknown): value is PromptPresetId {
  return typeof value === 'string' && (PROMPT_PRESET_IDS as string[]).includes(value)
}
