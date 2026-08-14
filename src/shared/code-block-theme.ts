export const CODE_BLOCK_THEMES = ['soft', 'light', 'dark'] as const

export type CodeBlockTheme = (typeof CODE_BLOCK_THEMES)[number]

export const DEFAULT_CODE_BLOCK_THEME: CodeBlockTheme = 'soft'

export function sanitizeCodeBlockTheme(value: unknown): CodeBlockTheme {
  return CODE_BLOCK_THEMES.includes(value as CodeBlockTheme)
    ? (value as CodeBlockTheme)
    : DEFAULT_CODE_BLOCK_THEME
}
