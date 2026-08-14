const DEFAULT_ERROR_DISPLAY_LIMIT = 600

export function formatErrorForDisplay(
  error: Pick<Error, 'name' | 'message'>,
  limit = DEFAULT_ERROR_DISPLAY_LIMIT
): string {
  const text = `${error.name}: ${error.message}`.replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}
