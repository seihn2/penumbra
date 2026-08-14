import { redactKnowledgeSecrets } from './knowledge-redaction'

export type ProjectSourceSymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'struct'
  | 'trait'
  | 'variable'

export interface ProjectSourceSymbol {
  name: string
  kind: ProjectSourceSymbolKind
  line: number
  exported: boolean
}

export interface ProjectSourceFile {
  relativePath: string
  symbols: ProjectSourceSymbol[]
  imports: string[]
  calls: string[]
  entrypoint: boolean
}

export type ProjectSourceRelationKind = 'imports' | 'calls'

export interface ProjectSourceRelation {
  kind: ProjectSourceRelationKind
  fromPath: string
  toPath: string
  symbol?: string
}

export interface ProjectSourceGraph {
  entrypoints: string[]
  relations: ProjectSourceRelation[]
}

interface ChunkLike {
  relativePath: string
  startLine: number
  symbol: string
  text: string
}

const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'go',
  'rs',
  'java',
  'kt',
  'kts',
  'swift',
  'c',
  'cc',
  'cpp',
  'h',
  'hpp',
  'cs',
  'php',
  'rb',
  'scala',
  'sh',
  'bash',
  'zsh',
  'sql',
  'graphql',
  'proto',
  'vue',
  'svelte'
])

const SYMBOL_PATTERNS: Array<{
  kind: ProjectSourceSymbolKind
  pattern: RegExp
}> = [
  {
    kind: 'class',
    pattern:
      /^\s*(?:(?:export|public|private|protected|static|final|abstract|sealed|open)\s+)*(?:class|record)\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'interface',
    pattern: /^\s*(?:(?:export|public)\s+)*interface\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'type',
    pattern: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'enum',
    pattern: /^\s*(?:(?:export|public)\s+)*enum\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'struct',
    pattern: /^\s*(?:(?:pub|public)\s+)*struct\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'trait',
    pattern: /^\s*(?:(?:pub|public)\s+)*trait\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'function',
    pattern:
      /^\s*(?:(?:export|public|private|protected|static|final|abstract|pub|open|override)\s+)*(?:async\s+)?(?:function|def|fn)\s+([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'function',
    pattern: /^\s*(?:pub\s+)?func\s+(?:\([^)]*\)\s*)?([A-Za-z_$][\w$]*)/
  },
  {
    kind: 'variable',
    pattern:
      /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/
  }
]

const CALL_KEYWORDS = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'function',
  'return',
  'throw',
  'typeof',
  'sizeof',
  'new',
  'class',
  'def',
  'fn',
  'func',
  'import',
  'require',
  'super',
  'this',
  'with',
  'match',
  'select',
  'print',
  'println',
  'console',
  'log'
])

const SOURCE_EXTENSIONS = [
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.kts',
  '.swift',
  '.cpp',
  '.cc',
  '.c',
  '.hpp',
  '.h',
  '.cs',
  '.php',
  '.rb',
  '.scala',
  '.sh',
  '.sql',
  '.graphql',
  '.proto',
  '.vue',
  '.svelte'
]

const MAX_SYMBOLS_PER_FILE = 120
const MAX_IMPORTS_PER_FILE = 80
const MAX_CALLS_PER_FILE = 160
const MAX_RELATIONS_PER_PROJECT = 6000

export function analyzeProjectSourceFile(input: {
  relativePath: string
  content: string
}): ProjectSourceFile {
  const relativePath = normalizePath(input.relativePath)
  if (!isCodePath(relativePath)) {
    return { relativePath, symbols: [], imports: [], calls: [], entrypoint: false }
  }

  const content = redactKnowledgeSecrets(input.content).replace(/\r\n?/g, '\n')
  const lines = content.split('\n')
  const symbols: ProjectSourceSymbol[] = []
  const symbolNames = new Set<string>()

  for (let index = 0; index < lines.length && symbols.length < MAX_SYMBOLS_PER_FILE; index += 1) {
    const symbol = symbolFromLine(lines[index], index + 1)
    if (!symbol || symbolNames.has(symbol.name)) continue
    symbolNames.add(symbol.name)
    symbols.push(symbol)
  }

  return {
    relativePath,
    symbols,
    imports: extractImports(relativePath, lines).slice(0, MAX_IMPORTS_PER_FILE),
    calls: extractCalls(lines, symbolNames).slice(0, MAX_CALLS_PER_FILE),
    entrypoint: isLikelyEntrypoint(relativePath)
  }
}

export function deriveProjectSourceFilesFromChunks(chunks: ChunkLike[]): ProjectSourceFile[] {
  const byPath = new Map<string, ChunkLike[]>()
  for (const chunk of chunks) {
    const relativePath = normalizePath(chunk.relativePath)
    const current = byPath.get(relativePath) ?? []
    current.push(chunk)
    byPath.set(relativePath, current)
  }

  return [...byPath.entries()].map(([relativePath, fileChunks]) => {
    const ordered = [...fileChunks].sort((a, b) => a.startLine - b.startLine)
    const content = ordered.map((chunk) => chunk.text).join('\n')
    const analyzed = analyzeProjectSourceFile({ relativePath, content })
    if (analyzed.symbols.length > 0) return analyzed

    const symbols = ordered
      .filter((chunk) => chunk.symbol)
      .map((chunk) => ({
        name: chunk.symbol,
        kind: 'function' as const,
        line: chunk.startLine,
        exported: false
      }))
      .filter((symbol, index, all) => all.findIndex((item) => item.name === symbol.name) === index)
      .slice(0, MAX_SYMBOLS_PER_FILE)
    return { ...analyzed, symbols }
  })
}

export function buildProjectSourceGraph(files: ProjectSourceFile[]): ProjectSourceGraph {
  const knownPaths = new Set(files.map((file) => normalizePath(file.relativePath)))
  const symbolDefinitions = new Map<string, Array<{ path: string; symbol: ProjectSourceSymbol }>>()
  for (const file of files) {
    for (const symbol of file.symbols) {
      const key = symbol.name.toLowerCase()
      const definitions = symbolDefinitions.get(key) ?? []
      definitions.push({ path: file.relativePath, symbol })
      symbolDefinitions.set(key, definitions)
    }
  }

  const relations: ProjectSourceRelation[] = []
  const relationKeys = new Set<string>()
  const addRelation = (relation: ProjectSourceRelation): void => {
    if (relations.length >= MAX_RELATIONS_PER_PROJECT) return
    const key = `${relation.kind}:${relation.fromPath}:${relation.toPath}:${relation.symbol ?? ''}`
    if (relation.fromPath === relation.toPath || relationKeys.has(key)) return
    relationKeys.add(key)
    relations.push(relation)
  }

  for (const file of files) {
    for (const specifier of file.imports) {
      const target = resolveImportTarget(file.relativePath, specifier, knownPaths)
      if (target) addRelation({ kind: 'imports', fromPath: file.relativePath, toPath: target })
    }
    for (const call of file.calls) {
      const definitions = symbolDefinitions.get(call.toLowerCase()) ?? []
      const target = pickBestDefinition(file.relativePath, definitions)
      if (target) {
        addRelation({
          kind: 'calls',
          fromPath: file.relativePath,
          toPath: target.path,
          symbol: target.symbol.name
        })
      }
    }
  }

  const explicitEntrypoints = files
    .filter((file) => file.entrypoint)
    .map((file) => file.relativePath)
  const incoming = new Set(
    relations.filter((item) => item.kind === 'imports').map((item) => item.toPath)
  )
  const fallbackEntrypoints = files
    .filter((file) => file.symbols.length > 0 && !incoming.has(file.relativePath))
    .map((file) => file.relativePath)
  return {
    entrypoints: unique([...explicitEntrypoints, ...fallbackEntrypoints]).slice(0, 12),
    relations
  }
}

export function isProjectSourceFile(value: unknown): value is ProjectSourceFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Partial<ProjectSourceFile>
  return (
    typeof file.relativePath === 'string' &&
    Array.isArray(file.symbols) &&
    file.symbols.every(isProjectSourceSymbol) &&
    Array.isArray(file.imports) &&
    file.imports.every((item) => typeof item === 'string') &&
    Array.isArray(file.calls) &&
    file.calls.every((item) => typeof item === 'string') &&
    typeof file.entrypoint === 'boolean'
  )
}

export function isProjectSourceRelation(value: unknown): value is ProjectSourceRelation {
  if (!value || typeof value !== 'object') return false
  const relation = value as Partial<ProjectSourceRelation>
  return (
    (relation.kind === 'imports' || relation.kind === 'calls') &&
    typeof relation.fromPath === 'string' &&
    typeof relation.toPath === 'string' &&
    (relation.symbol === undefined || typeof relation.symbol === 'string')
  )
}

function isProjectSourceSymbol(value: unknown): value is ProjectSourceSymbol {
  if (!value || typeof value !== 'object') return false
  const symbol = value as Partial<ProjectSourceSymbol>
  return (
    typeof symbol.name === 'string' &&
    typeof symbol.kind === 'string' &&
    typeof symbol.line === 'number' &&
    typeof symbol.exported === 'boolean'
  )
}

function symbolFromLine(line: string, lineNumber: number): ProjectSourceSymbol | null {
  for (const candidate of SYMBOL_PATTERNS) {
    const match = line.match(candidate.pattern)
    if (!match) continue
    return {
      name: match[1],
      kind: candidate.kind,
      line: lineNumber,
      exported: /\b(?:export|public|pub)\b/.test(line)
    }
  }
  return null
}

function extractImports(relativePath: string, lines: string[]): string[] {
  const imports: string[] = []
  const extension = fileExtension(relativePath)
  let inGoImportBlock = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (extension === 'go') {
      if (/^import\s*\($/.test(trimmed)) {
        inGoImportBlock = true
        continue
      }
      if (inGoImportBlock && trimmed === ')') {
        inGoImportBlock = false
        continue
      }
      const goMatch = trimmed.match(/^import\s+(?:[\w.]+\s+)?["`]([^"`]+)["`]$/)
      const goBlockMatch = inGoImportBlock
        ? trimmed.match(/^(?:[\w.]+\s+)?["`]([^"`]+)["`]$/)
        : null
      if (goMatch?.[1]) imports.push(goMatch[1])
      if (goBlockMatch?.[1]) imports.push(goBlockMatch[1])
    }

    for (const match of line.matchAll(/\b(?:from|require\s*\(|import\s*\()\s*["']([^"']+)["']/g)) {
      imports.push(match[1])
    }
    const sideEffectImport = line.match(/^\s*import\s*["']([^"']+)["']/)
    if (sideEffectImport?.[1]) imports.push(sideEffectImport[1])
    const pythonFrom = line.match(/^\s*from\s+([A-Za-z_][\w.]*)\s+import\s+/)
    if (pythonFrom?.[1]) imports.push(pythonFrom[1])
    const pythonImport = line.match(/^\s*import\s+([A-Za-z_][\w.]*)/)
    if (pythonImport?.[1]) imports.push(pythonImport[1])
    const javaImport = line.match(/^\s*import\s+(?:static\s+)?([\w.]+);/)
    if (javaImport?.[1]) imports.push(javaImport[1])
    const rustUse = line.match(/^\s*use\s+((?:crate|self|super)::[\w:]+)/)
    if (rustUse?.[1]) imports.push(rustUse[1])
    const include = line.match(/^\s*#include\s*[<"]([^>"]+)[>"]/)
    if (include?.[1]) imports.push(include[1])
  }
  return unique(imports.map((item) => item.trim()).filter(Boolean))
}

function extractCalls(lines: string[], declaredSymbols: Set<string>): string[] {
  const calls: string[] = []
  for (const line of lines) {
    const code = line.replace(/\/\/.*$/, '').replace(/#.*$/, '')
    for (const match of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = match[1]
      const lower = name.toLowerCase()
      if (CALL_KEYWORDS.has(lower) || declaredSymbols.has(name)) continue
      calls.push(name)
    }
  }
  return unique(calls)
}

function resolveImportTarget(
  fromPath: string,
  rawSpecifier: string,
  knownPaths: Set<string>
): string | null {
  const specifier = rawSpecifier.split(/[?#]/, 1)[0].trim()
  if (!specifier || /^(?:https?:|node:|data:)/.test(specifier)) return null

  const candidates: string[] = []
  if (specifier.startsWith('.')) {
    candidates.push(joinPath(pathDirectory(fromPath), specifier))
  } else {
    const aliasStripped = specifier.replace(/^[@~]\//, '')
    candidates.push(aliasStripped, aliasStripped.replace(/\./g, '/'))
    const packageSegments = aliasStripped.split('/')
    if (packageSegments.length > 1) candidates.push(packageSegments.slice(1).join('/'))
  }

  for (const candidate of unique(candidates.map(normalizePath))) {
    const exact = matchSourcePath(candidate, knownPaths)
    if (exact) return exact
    const suffixMatches = [...knownPaths].filter((path) => {
      const stem = stripSourceExtension(path)
      return (
        stem === candidate || stem.endsWith(`/${candidate}`) || stem.endsWith(`/${candidate}/index`)
      )
    })
    if (suffixMatches.length === 1) return suffixMatches[0]
  }
  return null
}

function matchSourcePath(candidate: string, knownPaths: Set<string>): string | null {
  if (knownPaths.has(candidate)) return candidate
  for (const extension of SOURCE_EXTENSIONS) {
    if (knownPaths.has(`${candidate}${extension}`)) return `${candidate}${extension}`
    if (knownPaths.has(`${candidate}/index${extension}`)) return `${candidate}/index${extension}`
  }
  return null
}

function pickBestDefinition(
  fromPath: string,
  definitions: Array<{ path: string; symbol: ProjectSourceSymbol }>
): { path: string; symbol: ProjectSourceSymbol } | null {
  const candidates = definitions.filter((definition) => definition.path !== fromPath)
  if (candidates.length === 0) return null
  return [...candidates].sort(
    (a, b) => commonPathPrefixLength(fromPath, b.path) - commonPathPrefixLength(fromPath, a.path)
  )[0]
}

function commonPathPrefixLength(left: string, right: string): number {
  const leftParts = left.split('/')
  const rightParts = right.split('/')
  let count = 0
  while (
    count < leftParts.length &&
    count < rightParts.length &&
    leftParts[count] === rightParts[count]
  ) {
    count += 1
  }
  return count
}

function isCodePath(relativePath: string): boolean {
  return CODE_EXTENSIONS.has(fileExtension(relativePath))
}

function fileExtension(relativePath: string): string {
  const fileName = relativePath.split('/').pop() ?? ''
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

function isLikelyEntrypoint(relativePath: string): boolean {
  const normalized = relativePath.toLowerCase()
  const fileName = normalized.split('/').pop() ?? normalized
  return (
    /^(?:main|index|app|server|cli|bootstrap|application)\.[^.]+$/.test(fileName) ||
    /(^|\/)src\/(?:main|server|app)\/(?:index|main)\.[^.]+$/.test(normalized) ||
    /(^|\/)(?:cmd|bin)\/[^/]+\/(?:main|index)\.[^.]+$/.test(normalized)
  )
}

function stripSourceExtension(path: string): string {
  const extension = SOURCE_EXTENSIONS.find((item) => path.endsWith(item))
  return extension ? path.slice(0, -extension.length) : path
}

function pathDirectory(path: string): string {
  const index = path.lastIndexOf('/')
  return index >= 0 ? path.slice(0, index) : ''
}

function joinPath(base: string, target: string): string {
  return normalizePath(`${base}/${target}`)
}

function normalizePath(value: string): string {
  const parts: string[] = []
  for (const part of value.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}
