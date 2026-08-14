import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type {
  ProjectKnowledgeChunk,
  ProjectKnowledgeMatch,
  ProjectKnowledgeProject
} from '../../../shared/project-knowledge'
import {
  expandProjectSearchQuery,
  extractProjectIdentifiers,
  fuseProjectSearchRanks,
  projectRawFtsQuery,
  projectSearchTermsText,
  projectTermsFtsQuery,
  rankProjectSourceFiles,
  tokenizeProjectSearch,
  type ProjectSearchRankList,
  type ProjectSearchSource
} from '../../../shared/project-search'

export interface IndexedFileFingerprint {
  relativePath: string
  mtimeMs: number
  size: number
  sha256: string
  language: string
}

export interface StoredFileFingerprint {
  mtimeMs: number
  size: number
  sha256: string
  language: string
}

interface FtsRow {
  chunkId: string
}

const INDEX_SCHEMA_VERSION = 1
const DEFAULT_CANDIDATE_LIMIT = 40

export class SqliteProjectIndex {
  private database: DatabaseSync | null = null
  private openError: Error | null = null

  constructor(private readonly filePath: string) {
    this.open()
  }

  get available(): boolean {
    return this.database !== null
  }

  get error(): Error | null {
    return this.openError
  }

  close(): void {
    this.database?.close()
    this.database = null
  }

  hasProject(projectId: string): boolean {
    const database = this.database
    if (!database) return false
    const row = database
      .prepare('SELECT project_id AS projectId FROM projects WHERE project_id = ? LIMIT 1')
      .get(projectId) as { projectId?: string } | undefined
    return row?.projectId === projectId
  }

  fileFingerprint(projectId: string, relativePath: string): StoredFileFingerprint | null {
    const database = this.database
    if (!database) return null
    const row = database
      .prepare(
        `SELECT mtime_ms AS mtimeMs, size, sha256, language
         FROM files
         WHERE project_id = ? AND relative_path = ?`
      )
      .get(projectId, relativePath) as StoredFileFingerprint | undefined
    return row ?? null
  }

  replaceProject(project: ProjectKnowledgeProject, files: IndexedFileFingerprint[]): void {
    const database = this.database
    if (!database) return

    database.exec('BEGIN IMMEDIATE')
    try {
      this.deleteProjectRows(database, project.id)
      database
        .prepare(
          `INSERT INTO projects(project_id, name, root_path, indexed_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(project.id, project.name, project.rootPath, project.indexedAt)

      const insertFile = database.prepare(
        `INSERT INTO files(project_id, relative_path, mtime_ms, size, sha256, language)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      for (const file of files) {
        insertFile.run(
          project.id,
          file.relativePath,
          file.mtimeMs,
          file.size,
          file.sha256,
          file.language
        )
      }

      const insertChunk = database.prepare(
        `INSERT INTO chunks(
           chunk_id, project_id, relative_path, start_line, end_line, kind, symbol, content
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      const insertRawFts = database.prepare(
        `INSERT INTO fts_raw(project_id, chunk_id, path, symbol, content)
         VALUES (?, ?, ?, ?, ?)`
      )
      const insertTermsFts = database.prepare(
        `INSERT INTO fts_terms(project_id, chunk_id, path_terms, symbol_terms, content_terms)
         VALUES (?, ?, ?, ?, ?)`
      )
      for (const chunk of project.chunks) {
        insertChunk.run(
          chunk.id,
          project.id,
          chunk.relativePath,
          chunk.startLine,
          chunk.endLine,
          chunk.kind,
          chunk.symbol,
          chunk.text
        )
        insertRawFts.run(project.id, chunk.id, chunk.relativePath, chunk.symbol, chunk.text)
        insertTermsFts.run(
          project.id,
          chunk.id,
          projectSearchTermsText(chunk.relativePath),
          projectSearchTermsText(chunk.symbol),
          projectSearchTermsText(chunk.text)
        )
      }

      const insertSymbol = database.prepare(
        `INSERT INTO symbols(
           project_id, relative_path, name, normalized_name, kind, line, exported, chunk_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const sourceFile of project.sourceFiles) {
        for (const symbol of sourceFile.symbols) {
          const chunk = bestChunkForSymbol(
            project.chunks,
            sourceFile.relativePath,
            symbol.name,
            symbol.line
          )
          insertSymbol.run(
            project.id,
            sourceFile.relativePath,
            symbol.name,
            symbol.name.toLowerCase(),
            symbol.kind,
            symbol.line,
            symbol.exported ? 1 : 0,
            chunk?.id ?? null
          )
        }
      }

      database.exec('COMMIT')
      this.secureDatabaseFile()
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }

  removeProject(projectId: string): void {
    const database = this.database
    if (!database) return
    database.exec('BEGIN IMMEDIATE')
    try {
      this.deleteProjectRows(database, projectId)
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }

  search(
    projects: ProjectKnowledgeProject[],
    query: string,
    limit = 6
  ): Array<ProjectKnowledgeMatch & { sources: ProjectSearchSource[] }> {
    const database = this.database
    const expandedQuery = expandProjectSearchQuery(query)
    const queryTokens = tokenizeProjectSearch(expandedQuery)
    if (!database || projects.length === 0 || queryTokens.length === 0 || limit <= 0) return []

    const candidateLimit = Math.max(DEFAULT_CANDIDATE_LIMIT, limit * 6)
    const projectIds = projects.map((project) => project.id)
    const projectByChunk = new Map<
      string,
      { project: ProjectKnowledgeProject; chunk: ProjectKnowledgeChunk }
    >()
    for (const project of projects) {
      for (const chunk of project.chunks) projectByChunk.set(chunk.id, { project, chunk })
    }

    const lists: ProjectSearchRankList[] = []
    const symbolIds = rankSymbolChunks(projects, expandedQuery, queryTokens, query).slice(
      0,
      candidateLimit
    )
    if (symbolIds.length > 0) lists.push({ source: 'symbol', weight: 2.4, ids: symbolIds })

    const rawQuery = projectRawFtsQuery(expandedQuery)
    if (rawQuery) {
      const ids = this.searchFts(
        database,
        'fts_raw',
        rawQuery,
        projectIds,
        candidateLimit,
        'bm25(fts_raw, 0.0, 0.0, 8.0, 12.0, 1.0)'
      )
      if (ids.length > 0) lists.push({ source: 'fts-raw', weight: 1.2, ids })
    }

    const termsQuery = projectTermsFtsQuery(expandedQuery)
    if (termsQuery) {
      const ids = this.searchFts(
        database,
        'fts_terms',
        termsQuery,
        projectIds,
        candidateLimit,
        'bm25(fts_terms, 0.0, 0.0, 8.0, 12.0, 1.0)'
      )
      if (ids.length > 0) lists.push({ source: 'fts-terms', weight: 1.1, ids })
    }

    if (lists.length > 0) {
      const repoMapIds: string[] = []
      const directIds = new Set(lists.flatMap((list) => list.ids.slice(0, candidateLimit)))
      for (const project of projects) {
        const directPaths = new Set(
          project.chunks
            .filter((chunk) => directIds.has(chunk.id))
            .map((chunk) => chunk.relativePath)
        )
        const relatedPaths = new Set(directPaths)
        for (const relation of project.relations) {
          if (directPaths.has(relation.fromPath)) relatedPaths.add(relation.toPath)
          if (directPaths.has(relation.toPath)) relatedPaths.add(relation.fromPath)
        }
        const rankedFiles = rankProjectSourceFiles(
          project.sourceFiles,
          project.relations,
          project.entrypoints,
          expandedQuery
        )
        for (const rankedFile of rankedFiles.slice(0, 12)) {
          if (
            !relatedPaths.has(rankedFile.relativePath) &&
            rankedFile.matchedSymbols.length === 0
          ) {
            continue
          }
          const chunk = bestChunkForRankedFile(
            project,
            rankedFile.relativePath,
            rankedFile.matchedSymbols
          )
          if (chunk) repoMapIds.push(chunk.id)
        }
      }
      if (repoMapIds.length > 0) lists.push({ source: 'repo-map', weight: 0.7, ids: repoMapIds })
    }

    const fused = fuseProjectSearchRanks(lists)
      .map((item) => {
        const candidate = projectByChunk.get(item.id)
        return {
          ...item,
          score: item.score * evidenceKindWeight(candidate?.chunk.kind, query)
        }
      })
      .sort((left, right) => right.score - left.score)
    const perFile = new Map<string, number>()
    const results: Array<ProjectKnowledgeMatch & { sources: ProjectSearchSource[] }> = []
    for (const item of fused) {
      const candidate = projectByChunk.get(item.id)
      if (!candidate) continue
      const fileKey = `${candidate.project.id}:${candidate.chunk.relativePath}`
      const fileCount = perFile.get(fileKey) ?? 0
      if (fileCount >= 2) continue
      results.push({
        projectName: candidate.project.name,
        chunk: candidate.chunk,
        score: item.score * 1000,
        sources: item.sources
      })
      perFile.set(fileKey, fileCount + 1)
      if (results.length >= limit) break
    }
    return results
  }

  private open(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true, mode: 0o700 })
      const database = new DatabaseSync(this.filePath)
      database.exec(
        'PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;'
      )
      this.createSchema(database)
      this.database = database
      this.secureDatabaseFile()
    } catch (error) {
      this.database = null
      this.openError = error instanceof Error ? error : new Error(String(error))
    }
  }

  private createSchema(database: DatabaseSync): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL,
        indexed_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS files (
        project_id TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        mtime_ms REAL NOT NULL,
        size INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        language TEXT NOT NULL,
        PRIMARY KEY(project_id, relative_path)
      );
      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        kind TEXT NOT NULL,
        symbol TEXT NOT NULL,
        content TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS symbols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        kind TEXT NOT NULL,
        line INTEGER NOT NULL,
        exported INTEGER NOT NULL,
        chunk_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_project_path
        ON chunks(project_id, relative_path);
      CREATE INDEX IF NOT EXISTS idx_symbols_project_name
        ON symbols(project_id, normalized_name);
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_raw USING fts5(
        project_id UNINDEXED,
        chunk_id UNINDEXED,
        path,
        symbol,
        content,
        tokenize = 'trigram'
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_terms USING fts5(
        project_id UNINDEXED,
        chunk_id UNINDEXED,
        path_terms,
        symbol_terms,
        content_terms,
        tokenize = 'unicode61'
      );
    `)
    database
      .prepare(
        `INSERT INTO metadata(key, value) VALUES ('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(String(INDEX_SCHEMA_VERSION))
  }

  private deleteProjectRows(database: DatabaseSync, projectId: string): void {
    database.prepare('DELETE FROM fts_raw WHERE project_id = ?').run(projectId)
    database.prepare('DELETE FROM fts_terms WHERE project_id = ?').run(projectId)
    database.prepare('DELETE FROM symbols WHERE project_id = ?').run(projectId)
    database.prepare('DELETE FROM chunks WHERE project_id = ?').run(projectId)
    database.prepare('DELETE FROM files WHERE project_id = ?').run(projectId)
    database.prepare('DELETE FROM projects WHERE project_id = ?').run(projectId)
  }

  private searchFts(
    database: DatabaseSync,
    table: 'fts_raw' | 'fts_terms',
    query: string,
    projectIds: string[],
    limit: number,
    rankExpression: string
  ): string[] {
    const placeholders = projectIds.map(() => '?').join(', ')
    try {
      const rows = database
        .prepare(
          `SELECT chunk_id AS chunkId
           FROM ${table}
           WHERE ${table} MATCH ? AND project_id IN (${placeholders})
           ORDER BY ${rankExpression}
           LIMIT ?`
        )
        .all(query, ...projectIds, limit) as unknown as FtsRow[]
      return rows.map((row) => row.chunkId)
    } catch {
      return []
    }
  }

  private secureDatabaseFile(): void {
    try {
      chmodSync(this.filePath, 0o600)
    } catch {
      // Best effort on platforms without POSIX file modes.
    }
  }
}

function evidenceKindWeight(
  kind: ProjectKnowledgeChunk['kind'] | undefined,
  query: string
): number {
  if (!kind) return 1
  const normalized = query.toLowerCase()
  const asksForTests = /(?:测试|test|spec|coverage)/i.test(normalized)
  const asksForDocs = /(?:文档|readme|说明|documentation|docs?)/i.test(normalized)
  if (kind === 'source') return 1.35
  if (kind === 'test') return asksForTests ? 1.3 : 0.55
  if (kind === 'documentation') return asksForDocs ? 1.15 : 0.48
  return 0.8
}

function rankSymbolChunks(
  projects: ProjectKnowledgeProject[],
  query: string,
  queryTokens: string[],
  explicitQuery = query
): string[] {
  const normalizedQuery = query.toLowerCase()
  const explicitIdentifiers = extractProjectIdentifiers(explicitQuery)
  const ranked: Array<{ id: string; score: number }> = []
  for (const project of projects) {
    for (const file of project.sourceFiles) {
      for (const symbol of file.symbols) {
        const normalizedName = symbol.name.toLowerCase()
        let score = 0
        if (explicitIdentifiers.length > 0) {
          for (const identifier of explicitIdentifiers) {
            if (normalizedName === identifier) score += 140
            else if (normalizedName.startsWith(identifier)) score += 90
            else if (normalizedName.includes(identifier)) score += 60
          }
        } else {
          score = normalizedQuery.includes(normalizedName) ? 100 : 0
          for (const token of queryTokens) {
            if (token.length < 3) continue
            if (normalizedName === token) score += 80
            else if (normalizedName.includes(token)) score += 20
          }
        }
        if (score <= 0) continue
        const chunk = bestChunkForSymbol(
          project.chunks,
          file.relativePath,
          symbol.name,
          symbol.line
        )
        if (chunk) ranked.push({ id: chunk.id, score })
      }
    }
  }
  return ranked
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .map((item) => item.id)
}

function bestChunkForSymbol(
  chunks: ProjectKnowledgeChunk[],
  relativePath: string,
  symbol: string,
  line: number
): ProjectKnowledgeChunk | undefined {
  const fileChunks = chunks.filter((chunk) => chunk.relativePath === relativePath)
  return (
    fileChunks.find((chunk) => chunk.symbol.toLowerCase() === symbol.toLowerCase()) ??
    fileChunks.find((chunk) => chunk.startLine <= line && chunk.endLine >= line) ??
    fileChunks[0]
  )
}

function bestChunkForRankedFile(
  project: ProjectKnowledgeProject,
  relativePath: string,
  matchedSymbols: string[]
): ProjectKnowledgeChunk | undefined {
  const chunks = project.chunks.filter((chunk) => chunk.relativePath === relativePath)
  for (const symbol of matchedSymbols) {
    const match = chunks.find((chunk) => chunk.symbol.toLowerCase() === symbol.toLowerCase())
    if (match) return match
  }
  return chunks[0]
}
