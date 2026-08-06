export type CodingLanguageOption = {
  value: string
  label: string
}

export const defaultCodingLanguages: CodingLanguageOption[] = [
  { value: 'python', label: 'Python3' },
  { value: 'java', label: 'Java' },
  { value: 'c++', label: 'C++' },
  { value: 'c#', label: 'C#' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'php', label: 'PHP' },
  { value: 'go', label: 'Go (Golang)' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'shell', label: 'Shell' }
]

export function normalizeCodingLanguageValue(language: string): string {
  return language.trim().toLowerCase().replace(/\s+/g, '-')
}
