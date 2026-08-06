/** Top-level usage mode. Algorithm mode targets coding/interview problems
   (code + complexity + edge cases); general mode is a plain assistant that
   answers any question without forcing a coding format. */
export type AppMode = 'algorithm' | 'general'

export const APP_MODES: AppMode[] = ['algorithm', 'general']

export const DEFAULT_APP_MODE: AppMode = 'algorithm'

/** Base system prompt for the general (non-algorithm) mode. The algorithm mode
   uses the bundled prompts.md instead. */
export const GENERAL_SYSTEM_PROMPT = `你是一名博学、可靠的 AI 助手，帮助用户在面试或工作中快速理解问题并给出清晰、准确的回答。

使用中文回答。

## 回答要求

- 先简要概括截图或问题中的关键点；
- 给出条理清晰、直接可用的回答，避免冗长铺垫；
- 涉及代码、命令或配置时，使用 Markdown 代码块并标注语言；
- 如信息不足，可合理推断并说明假设，或指出还需要哪些信息。`

export function isAppMode(value: unknown): value is AppMode {
  return value === 'algorithm' || value === 'general'
}
