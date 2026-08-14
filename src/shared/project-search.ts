import type { ProjectSourceFile, ProjectSourceRelation } from './project-source-graph'

export type ProjectSearchSource = 'symbol' | 'fts-raw' | 'fts-terms' | 'repo-map' | 'graph'

export interface ProjectSearchRankList {
  source: ProjectSearchSource
  weight: number
  ids: string[]
}

export interface FusedProjectSearchRank {
  id: string
  score: number
  sources: ProjectSearchSource[]
}

export interface RankedProjectSourceFile {
  relativePath: string
  score: number
  matchedSymbols: string[]
}

const RRF_K = 60
const PAGERANK_DAMPING = 0.85
const PAGERANK_ITERATIONS = 24
const QUERY_ALIASES: Array<{ pattern: RegExp; aliases: string[] }> = [
  { pattern: /模型/, aliases: ['model'] },
  { pattern: /列表|清单/, aliases: ['list', 'catalog', 'available'] },
  { pattern: /拉取|读取|获取/, aliases: ['fetch', 'load', 'retrieve'] },
  { pattern: /服务商|平台/, aliases: ['provider', 'platform'] },
  { pattern: /透明度|不透明度/, aliases: ['opacity'] },
  { pattern: /文字/, aliases: ['text'] },
  { pattern: /图标/, aliases: ['icon'] },
  { pattern: /窗口/, aliases: ['window'] },
  { pattern: /调节|调整/, aliases: ['adjust', 'clamp'] },
  { pattern: /问题/, aliases: ['question'] },
  { pattern: /修订|改写/, aliases: ['revision', 'amend', 'merge'] },
  { pattern: /旧回答|旧结果|过期/, aliases: ['stale', 'expired'] },
  { pattern: /覆盖/, aliases: ['overwrite', 'replace', 'stale'] },
  { pattern: /回答|应答/, aliases: ['answer', 'response', 'assist'] },
  { pattern: /阻止|避免/, aliases: ['prevent', 'guard'] },
  { pattern: /先说这句/, aliases: ['opening'] },
  { pattern: /回答路线/, aliases: ['path', 'route'] },
  { pattern: /项目证据|证据/, aliases: ['evidence'] },
  { pattern: /结构化/, aliases: ['structured'] },
  { pattern: /标签/, aliases: ['tag', 'block'] },
  { pattern: /解析/, aliases: ['parse'] },
  { pattern: /索引|入库/, aliases: ['index'] },
  { pattern: /脱敏/, aliases: ['redact', 'sanitize', 'mask'] },
  { pattern: /私钥/, aliases: ['private', 'key', 'secret'] },
  { pattern: /外部知识库|外部知识|知识源/, aliases: ['external', 'knowledge', 'source'] },
  { pattern: /超时/, aliases: ['timeout'] },
  { pattern: /鉴权|认证/, aliases: ['auth', 'authorization', 'header'] },
  { pattern: /转换|归一化/, aliases: ['normalize', 'transform'] },
  { pattern: /实时语音识别|语音识别/, aliases: ['realtime', 'asr', 'transcription'] },
  { pattern: /面试官/, aliases: ['interviewer'] },
  { pattern: /触发/, aliases: ['trigger', 'run', 'generate'] },
  { pattern: /截图/, aliases: ['screenshot', 'capture'] },
  { pattern: /显示器|屏幕/, aliases: ['display', 'screen', 'desktop'] }
]

export function tokenizeProjectSearch(value: string): string[] {
  const tokens = new Set<string>()
  const identifierMatches = value.matchAll(/[A-Za-z0-9_$][A-Za-z0-9_.$-]*/g)
  for (const match of identifierMatches) {
    const raw = match[0]
    if (raw.length < 2) continue
    const normalized = raw.toLowerCase()
    tokens.add(normalized)
    for (const segment of splitIdentifier(raw)) {
      if (segment.length >= 2) tokens.add(segment.toLowerCase())
    }
  }

  for (const match of value.matchAll(/[\u3400-\u9fff]{2,}/g)) {
    const phrase = match[0]
    if (phrase.length <= 12) tokens.add(phrase)
    for (let index = 0; index < phrase.length - 1; index += 1) {
      tokens.add(phrase.slice(index, index + 2))
    }
  }

  return [...tokens]
}

export function expandProjectSearchQuery(value: string): string {
  const aliases = new Set<string>()
  for (const entry of QUERY_ALIASES) {
    if (entry.pattern.test(value)) entry.aliases.forEach((alias) => aliases.add(alias))
  }
  return aliases.size > 0 ? `${value} ${[...aliases].join(' ')}` : value
}

export function extractProjectIdentifiers(value: string): string[] {
  const identifiers = new Set<string>()
  for (const match of value.matchAll(/[A-Za-z_$][A-Za-z0-9_.$-]{2,}/g)) {
    const candidate = match[0]
    const hasCamelBoundary = /[a-z0-9][A-Z]/.test(candidate)
    if (!hasCamelBoundary && !/[_.$-]/.test(candidate)) continue
    identifiers.add(candidate.toLowerCase())
  }
  return [...identifiers]
}

export function projectSearchTermsText(value: string): string {
  return tokenizeProjectSearch(value).join(' ')
}

export function projectRawFtsQuery(value: string): string {
  return tokenizeProjectSearch(value)
    .filter((token) => token.length >= 3)
    .map(quoteFtsToken)
    .join(' OR ')
}

export function projectTermsFtsQuery(value: string): string {
  return tokenizeProjectSearch(value).map(quoteFtsToken).join(' OR ')
}

export function fuseProjectSearchRanks(
  lists: ProjectSearchRankList[],
  k = RRF_K
): FusedProjectSearchRank[] {
  const fused = new Map<string, FusedProjectSearchRank>()
  for (const list of lists) {
    const seen = new Set<string>()
    list.ids.forEach((id, index) => {
      if (!id || seen.has(id)) return
      seen.add(id)
      const current = fused.get(id) ?? { id, score: 0, sources: [] }
      current.score += list.weight / (k + index + 1)
      if (!current.sources.includes(list.source)) current.sources.push(list.source)
      fused.set(id, current)
    })
  }
  for (const item of fused.values()) {
    if (item.sources.length > 1) item.score *= 1 + (item.sources.length - 1) * 0.2
  }
  return [...fused.values()].sort((left, right) => right.score - left.score)
}

export function rankProjectSourceFiles(
  files: ProjectSourceFile[],
  relations: ProjectSourceRelation[],
  entrypoints: string[],
  query: string
): RankedProjectSourceFile[] {
  if (files.length === 0) return []
  const queryTokens = new Set(tokenizeProjectSearch(query))
  const knownPaths = new Set(files.map((file) => file.relativePath))
  const outgoing = new Map<string, Array<{ target: string; weight: number }>>()
  const symbolFrequency = new Map<string, number>()

  for (const relation of relations) {
    if (!knownPaths.has(relation.fromPath) || !knownPaths.has(relation.toPath)) continue
    if (relation.symbol) {
      const key = relation.symbol.toLowerCase()
      symbolFrequency.set(key, (symbolFrequency.get(key) ?? 0) + 1)
    }
  }

  for (const relation of relations) {
    if (!knownPaths.has(relation.fromPath) || !knownPaths.has(relation.toPath)) continue
    const symbol = relation.symbol?.toLowerCase() ?? ''
    const rarity = symbol ? 1 / Math.sqrt(symbolFrequency.get(symbol) ?? 1) : 1
    const mentioned = symbol && [...queryTokens].some((token) => symbol.includes(token)) ? 8 : 1
    const base = relation.kind === 'calls' ? 2 : 1
    const edges = outgoing.get(relation.fromPath) ?? []
    edges.push({ target: relation.toPath, weight: base * rarity * mentioned })
    outgoing.set(relation.fromPath, edges)
  }

  const entrypointSet = new Set(entrypoints)
  const personalization = new Map<string, number>()
  const matchedSymbolsByPath = new Map<string, string[]>()
  for (const file of files) {
    const pathTokens = tokenizeProjectSearch(file.relativePath)
    const matchedSymbols = file.symbols
      .map((symbol) => symbol.name)
      .filter((name) => {
        const normalized = name.toLowerCase()
        return [...queryTokens].some((token) => normalized.includes(token))
      })
    matchedSymbolsByPath.set(file.relativePath, matchedSymbols)
    const pathMatches = pathTokens.filter((token) => queryTokens.has(token)).length
    let score = 0.05
    if (entrypointSet.has(file.relativePath)) score += 0.25
    score += pathMatches * 1.5
    score += matchedSymbols.length * 4
    personalization.set(file.relativePath, score)
  }

  const totalPersonalization = sum(personalization.values())
  if (totalPersonalization <= 0) {
    for (const file of files) personalization.set(file.relativePath, 1 / files.length)
  } else {
    for (const [path, score] of personalization) {
      personalization.set(path, score / totalPersonalization)
    }
  }

  let rank = new Map(personalization)
  for (let iteration = 0; iteration < PAGERANK_ITERATIONS; iteration += 1) {
    const next = new Map<string, number>()
    for (const file of files) {
      next.set(
        file.relativePath,
        (1 - PAGERANK_DAMPING) * (personalization.get(file.relativePath) ?? 0)
      )
    }

    let danglingRank = 0
    for (const file of files) {
      const sourceRank = rank.get(file.relativePath) ?? 0
      const edges = outgoing.get(file.relativePath) ?? []
      const totalWeight = edges.reduce((total, edge) => total + edge.weight, 0)
      if (totalWeight <= 0) {
        danglingRank += sourceRank
        continue
      }
      for (const edge of edges) {
        next.set(
          edge.target,
          (next.get(edge.target) ?? 0) + PAGERANK_DAMPING * sourceRank * (edge.weight / totalWeight)
        )
      }
    }

    if (danglingRank > 0) {
      for (const file of files) {
        next.set(
          file.relativePath,
          (next.get(file.relativePath) ?? 0) +
            PAGERANK_DAMPING * danglingRank * (personalization.get(file.relativePath) ?? 0)
        )
      }
    }
    rank = next
  }

  return files
    .map((file) => ({
      relativePath: file.relativePath,
      score: rank.get(file.relativePath) ?? 0,
      matchedSymbols: matchedSymbolsByPath.get(file.relativePath) ?? []
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.relativePath.localeCompare(right.relativePath)
    )
}

function splitIdentifier(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[_.\-$\s]+/)
    .filter(Boolean)
}

function quoteFtsToken(token: string): string {
  return `"${token.replace(/"/g, '""')}"`
}

function sum(values: Iterable<number>): number {
  let total = 0
  for (const value of values) total += value
  return total
}
