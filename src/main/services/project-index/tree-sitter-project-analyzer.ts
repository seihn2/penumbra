import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Language, Parser, type Node as SyntaxNode } from 'web-tree-sitter'
import {
  chunkProjectFile,
  projectKnowledgeKindForPath,
  redactKnowledgeSecrets,
  stableId,
  type ProjectKnowledgeChunk,
  type ProjectKnowledgeKind
} from '../../../shared/project-knowledge'
import {
  analyzeProjectSourceFile,
  type ProjectSourceFile,
  type ProjectSourceSymbol,
  type ProjectSourceSymbolKind
} from '../../../shared/project-source-graph'

export interface ProjectFileAnalysis {
  engine: 'tree-sitter' | 'regex'
  language: string
  chunks: ProjectKnowledgeChunk[]
  sourceFile: ProjectSourceFile
}

interface GrammarConfig {
  language: string
  wasmFileName: string
  wasmSpecifier: string
  definitions: Record<string, ProjectSourceSymbolKind>
  callNodeTypes: Set<string>
  classNodeTypes: Set<string>
}

interface DefinitionNode {
  node: SyntaxNode
  symbol: ProjectSourceSymbol
}

const require = createRequire(import.meta.url)
const moduleDirectory = dirname(fileURLToPath(import.meta.url))
const MAX_SEMANTIC_CHUNK_LINES = 120
const SEMANTIC_CHUNK_OVERLAP_LINES = 12
const MAX_SYMBOLS_PER_FILE = 160
const MAX_CALLS_PER_FILE = 220

const COMMON_CALL_KEYWORDS = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'return',
  'throw',
  'typeof',
  'sizeof',
  'new',
  'super',
  'this',
  'print',
  'println',
  'console',
  'log'
])

const GRAMMARS: Record<string, GrammarConfig> = {
  typescript: {
    language: 'typescript',
    wasmFileName: 'tree-sitter-typescript.wasm',
    wasmSpecifier: 'tree-sitter-typescript/tree-sitter-typescript.wasm',
    definitions: {
      class_declaration: 'class',
      abstract_class_declaration: 'class',
      interface_declaration: 'interface',
      type_alias_declaration: 'type',
      enum_declaration: 'enum',
      function_declaration: 'function',
      generator_function_declaration: 'function',
      method_definition: 'function',
      method_signature: 'function',
      abstract_method_signature: 'function',
      public_field_definition: 'variable',
      variable_declarator: 'variable'
    },
    callNodeTypes: new Set(['call_expression', 'new_expression']),
    classNodeTypes: new Set(['class_declaration', 'abstract_class_declaration'])
  },
  tsx: {
    language: 'tsx',
    wasmFileName: 'tree-sitter-tsx.wasm',
    wasmSpecifier: 'tree-sitter-typescript/tree-sitter-tsx.wasm',
    definitions: {
      class_declaration: 'class',
      abstract_class_declaration: 'class',
      interface_declaration: 'interface',
      type_alias_declaration: 'type',
      enum_declaration: 'enum',
      function_declaration: 'function',
      generator_function_declaration: 'function',
      method_definition: 'function',
      public_field_definition: 'variable',
      variable_declarator: 'variable'
    },
    callNodeTypes: new Set(['call_expression', 'new_expression']),
    classNodeTypes: new Set(['class_declaration', 'abstract_class_declaration'])
  },
  javascript: {
    language: 'javascript',
    wasmFileName: 'tree-sitter-javascript.wasm',
    wasmSpecifier: 'tree-sitter-javascript/tree-sitter-javascript.wasm',
    definitions: {
      class_declaration: 'class',
      function_declaration: 'function',
      generator_function_declaration: 'function',
      method_definition: 'function',
      field_definition: 'variable',
      variable_declarator: 'variable'
    },
    callNodeTypes: new Set(['call_expression', 'new_expression']),
    classNodeTypes: new Set(['class_declaration'])
  },
  python: {
    language: 'python',
    wasmFileName: 'tree-sitter-python.wasm',
    wasmSpecifier: 'tree-sitter-python/tree-sitter-python.wasm',
    definitions: {
      class_definition: 'class',
      function_definition: 'function'
    },
    callNodeTypes: new Set(['call']),
    classNodeTypes: new Set(['class_definition'])
  },
  go: {
    language: 'go',
    wasmFileName: 'tree-sitter-go.wasm',
    wasmSpecifier: 'tree-sitter-go/tree-sitter-go.wasm',
    definitions: {
      function_declaration: 'function',
      method_declaration: 'function',
      type_spec: 'type'
    },
    callNodeTypes: new Set(['call_expression']),
    classNodeTypes: new Set([])
  },
  java: {
    language: 'java',
    wasmFileName: 'tree-sitter-java.wasm',
    wasmSpecifier: 'tree-sitter-java/tree-sitter-java.wasm',
    definitions: {
      class_declaration: 'class',
      interface_declaration: 'interface',
      enum_declaration: 'enum',
      record_declaration: 'class',
      method_declaration: 'function',
      constructor_declaration: 'function'
    },
    callNodeTypes: new Set(['method_invocation', 'object_creation_expression']),
    classNodeTypes: new Set(['class_declaration', 'record_declaration'])
  },
  rust: {
    language: 'rust',
    wasmFileName: 'tree-sitter-rust.wasm',
    wasmSpecifier: 'tree-sitter-rust/tree-sitter-rust.wasm',
    definitions: {
      function_item: 'function',
      struct_item: 'struct',
      enum_item: 'enum',
      trait_item: 'trait',
      type_item: 'type'
    },
    callNodeTypes: new Set(['call_expression', 'macro_invocation']),
    classNodeTypes: new Set([])
  }
}

let parserInitialization: Promise<void> | null = null
const languageCache = new Map<string, Promise<Language>>()

export async function analyzeProjectFile(input: {
  projectId: string
  relativePath: string
  content: string
}): Promise<ProjectFileAnalysis> {
  const fallback = fallbackAnalysis(input)
  const config = grammarForPath(input.relativePath)
  if (!config) return fallback

  const sanitized = redactKnowledgeSecrets(input.content).replace(/\r\n?/g, '\n')
  let parser: Parser | null = null
  let tree: ReturnType<Parser['parse']> | null = null
  try {
    await ensureParserInitialized()
    const language = await loadLanguage(config)
    parser = new Parser()
    parser.setLanguage(language)
    tree = parser.parse(sanitized)
    if (!tree) throw new Error(`Tree-sitter returned no syntax tree for ${input.relativePath}`)
    const definitions = collectDefinitions(tree.rootNode, sanitized, config)
    const sourceFile: ProjectSourceFile = {
      ...fallback.sourceFile,
      symbols:
        definitions.length > 0
          ? definitions.map((definition) => definition.symbol).slice(0, MAX_SYMBOLS_PER_FILE)
          : fallback.sourceFile.symbols,
      calls: collectCalls(tree.rootNode, sanitized, config).slice(0, MAX_CALLS_PER_FILE)
    }
    const chunks = buildSemanticChunks(
      input.projectId,
      input.relativePath,
      sanitized,
      projectKnowledgeKindForPath(input.relativePath),
      definitions,
      config
    )
    return {
      engine: 'tree-sitter',
      language: config.language,
      chunks: chunks.length > 0 ? chunks : fallback.chunks,
      sourceFile
    }
  } catch {
    return fallback
  } finally {
    tree?.delete()
    parser?.delete()
  }
}

export function projectLanguageForPath(relativePath: string): string {
  return grammarForPath(relativePath)?.language ?? 'fallback'
}

function fallbackAnalysis(input: {
  projectId: string
  relativePath: string
  content: string
}): ProjectFileAnalysis {
  return {
    engine: 'regex',
    language: projectLanguageForPath(input.relativePath),
    chunks: chunkProjectFile(input),
    sourceFile: analyzeProjectSourceFile({
      relativePath: input.relativePath,
      content: input.content
    })
  }
}

function grammarForPath(relativePath: string): GrammarConfig | null {
  const extension = extname(relativePath).toLowerCase()
  if (extension === '.ts') return GRAMMARS.typescript
  if (extension === '.tsx') return GRAMMARS.tsx
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(extension)) return GRAMMARS.javascript
  if (extension === '.py') return GRAMMARS.python
  if (extension === '.go') return GRAMMARS.go
  if (extension === '.java') return GRAMMARS.java
  if (extension === '.rs') return GRAMMARS.rust
  return null
}

async function ensureParserInitialized(): Promise<void> {
  if (!parserInitialization) {
    parserInitialization = Parser.init({
      locateFile: () => resolveWasmAsset('web-tree-sitter.wasm')
    })
  }
  await parserInitialization
}

async function loadLanguage(config: GrammarConfig): Promise<Language> {
  let pending = languageCache.get(config.language)
  if (!pending) {
    pending = Language.load(resolveWasmAsset(config.wasmFileName, config.wasmSpecifier))
    languageCache.set(config.language, pending)
  }
  return pending
}

function resolveWasmAsset(
  fileName: string,
  specifier = 'web-tree-sitter/web-tree-sitter.wasm'
): string {
  const bundled = join(moduleDirectory, 'grammars', fileName)
  return existsSync(bundled) ? bundled : require.resolve(specifier)
}

function collectDefinitions(
  root: SyntaxNode,
  content: string,
  config: GrammarConfig
): DefinitionNode[] {
  const definitions: DefinitionNode[] = []
  visit(root, (node) => {
    const kind = config.definitions[node.type]
    if (!kind || definitions.length >= MAX_SYMBOLS_PER_FILE) return
    if (!isCallableVariable(node)) return
    const nameNode = definitionNameNode(node)
    const name = nameNode ? nodeText(nameNode, content).trim() : ''
    if (!name) return
    definitions.push({
      node,
      symbol: {
        name,
        kind: callableKind(node, kind),
        line: node.startPosition.row + 1,
        exported: isExported(node, name, content, config.language)
      }
    })
  })
  return uniqueDefinitions(definitions)
}

function collectCalls(root: SyntaxNode, content: string, config: GrammarConfig): string[] {
  const calls: string[] = []
  visit(root, (node) => {
    if (!config.callNodeTypes.has(node.type)) return
    const name = callName(node, content)
    if (!name || COMMON_CALL_KEYWORDS.has(name.toLowerCase())) return
    calls.push(name)
  })
  return [...new Set(calls)]
}

function buildSemanticChunks(
  projectId: string,
  relativePath: string,
  content: string,
  kind: ProjectKnowledgeKind,
  definitions: DefinitionNode[],
  config: GrammarConfig
): ProjectKnowledgeChunk[] {
  if (definitions.length === 0) return []
  const lines = content.split('\n')
  const chunks: ProjectKnowledgeChunk[] = []
  const firstDefinitionLine = Math.min(
    ...definitions.map((definition) => definition.node.startPosition.row)
  )
  if (firstDefinitionLine > 0) {
    addChunkWindows(chunks, {
      projectId,
      relativePath,
      kind,
      symbol: '',
      lines,
      start: 0,
      end: Math.min(lines.length, firstDefinitionLine),
      idSuffix: 'module'
    })
  }

  for (const definition of definitions) {
    const range = semanticNodeRange(definition.node, config)
    addChunkWindows(chunks, {
      projectId,
      relativePath,
      kind,
      symbol: definition.symbol.name,
      lines,
      start: range.start,
      end: range.end,
      idSuffix: `${definition.node.type}:${definition.symbol.name}`
    })
  }

  const seen = new Set<string>()
  return chunks.filter((chunk) => {
    const key = `${chunk.relativePath}:${chunk.startLine}:${chunk.endLine}:${chunk.symbol}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function addChunkWindows(
  chunks: ProjectKnowledgeChunk[],
  input: {
    projectId: string
    relativePath: string
    kind: ProjectKnowledgeKind
    symbol: string
    lines: string[]
    start: number
    end: number
    idSuffix: string
  }
): void {
  const boundedStart = Math.max(0, input.start)
  const boundedEnd = Math.min(input.lines.length, Math.max(boundedStart + 1, input.end))
  for (
    let windowStart = boundedStart;
    windowStart < boundedEnd;
    windowStart += MAX_SEMANTIC_CHUNK_LINES - SEMANTIC_CHUNK_OVERLAP_LINES
  ) {
    const windowEnd = Math.min(boundedEnd, windowStart + MAX_SEMANTIC_CHUNK_LINES)
    const text = input.lines.slice(windowStart, windowEnd).join('\n').trim()
    if (!text) break
    chunks.push({
      id: stableId(
        `${input.projectId}:${input.relativePath}:${windowStart + 1}:${input.idSuffix}:${text}`
      ),
      projectId: input.projectId,
      relativePath: input.relativePath,
      startLine: windowStart + 1,
      endLine: windowEnd,
      kind: input.kind,
      symbol: input.symbol,
      text
    })
    if (windowEnd >= boundedEnd) break
  }
}

function semanticNodeRange(
  node: SyntaxNode,
  config: GrammarConfig
): { start: number; end: number } {
  const start = node.startPosition.row
  if (!config.classNodeTypes.has(node.type)) {
    return { start, end: node.endPosition.row + 1 }
  }
  const body = node.childForFieldName('body')
  if (!body) return { start, end: Math.min(node.endPosition.row + 1, start + 12) }
  return {
    start,
    end: Math.min(node.endPosition.row + 1, Math.max(start + 1, body.startPosition.row + 1))
  }
}

function definitionNameNode(node: SyntaxNode): SyntaxNode | null {
  return (
    node.childForFieldName('name') ??
    node.childForFieldName('declarator') ??
    node.namedChildren.find((child) =>
      ['identifier', 'type_identifier', 'property_identifier'].includes(child.type)
    ) ??
    null
  )
}

function isCallableVariable(node: SyntaxNode): boolean {
  if (!['variable_declarator', 'public_field_definition', 'field_definition'].includes(node.type)) {
    return true
  }
  const value = node.childForFieldName('value')
  return Boolean(value && ['arrow_function', 'function_expression'].includes(value.type))
}

function callableKind(
  node: SyntaxNode,
  fallback: ProjectSourceSymbolKind
): ProjectSourceSymbolKind {
  return ['variable_declarator', 'public_field_definition', 'field_definition'].includes(node.type)
    ? 'function'
    : fallback
}

function isExported(node: SyntaxNode, name: string, content: string, language: string): boolean {
  const prefix = nodeText(node, content).slice(0, 160)
  if (node.parent?.type === 'export_statement' || /\b(?:export|public|pub)\b/.test(prefix)) {
    return true
  }
  if (language === 'python') return !name.startsWith('_')
  if (language === 'go') return /^[A-Z]/.test(name)
  return false
}

function callName(node: SyntaxNode, content: string): string {
  const target =
    node.childForFieldName('function') ??
    node.childForFieldName('name') ??
    node.childForFieldName('constructor') ??
    node.namedChildren[0]
  if (!target) return ''
  const property = target.childForFieldName('property') ?? target.childForFieldName('name')
  if (property) return nodeText(property, content).trim()
  const identifiers = collectIdentifierNodes(target)
  return identifiers.length > 0
    ? nodeText(identifiers[identifiers.length - 1], content).trim()
    : (nodeText(target, content).trim().split(/[.:]/).pop()?.replace(/\W+$/g, '') ?? '')
}

function collectIdentifierNodes(node: SyntaxNode): SyntaxNode[] {
  const identifiers: SyntaxNode[] = []
  visit(node, (candidate) => {
    if (
      ['identifier', 'property_identifier', 'type_identifier', 'field_identifier'].includes(
        candidate.type
      )
    ) {
      identifiers.push(candidate)
    }
  })
  return identifiers
}

function uniqueDefinitions(definitions: DefinitionNode[]): DefinitionNode[] {
  const seen = new Set<string>()
  return definitions.filter((definition) => {
    const key = `${definition.symbol.name}:${definition.symbol.line}:${definition.node.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function nodeText(node: SyntaxNode, content: string): string {
  return content.slice(node.startIndex, node.endIndex)
}

function visit(node: SyntaxNode, callback: (node: SyntaxNode) => void): void {
  callback(node)
  for (const child of node.namedChildren) visit(child, callback)
}
