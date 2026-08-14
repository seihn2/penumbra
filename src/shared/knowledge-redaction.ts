export function redactKnowledgeSecrets(content: string): string {
  return content
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi,
      '[PRIVATE KEY REDACTED]'
    )
    .replace(
      /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\b(\s*[:=]\s*)["'`]([^"'`\n]{6,})["'`]/gi,
      (_match, key: string, separator: string) => `${key}${separator}"[REDACTED]"`
    )
}
