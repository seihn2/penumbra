import { app } from 'electron'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, type Dirent } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import {
  buildProjectKnowledgePrompt,
  chunkProjectFile,
  emptyProjectKnowledgeState,
  matchInterviewAnswerPolicy,
  normalizeProjectKnowledgeState,
  projectKnowledgeOverview,
  removeInterviewAnswerPolicy,
  retrieveProjectKnowledge,
  stableId,
  upsertInterviewAnswerPolicy,
  type InterviewAnswerPolicy,
  type ProjectKnowledgeChunk,
  type ProjectKnowledgeDocument,
  type ProjectKnowledgeOverview,
  type ProjectKnowledgeProject,
  type ProjectKnowledgeRetrieval,
  type ProjectKnowledgeState
} from '../../shared/project-knowledge'
import { buildProjectSourceGraph, type ProjectSourceFile } from '../../shared/project-source-graph'
import {
  EXTERNAL_KNOWLEDGE_DEFAULTS,
  type ExternalKnowledgeRole,
  type ExternalKnowledgeSource,
  type ExternalKnowledgeSourceInput,
  type ExternalKnowledgeTestResult
} from '../../shared/external-knowledge'
import {
  SqliteProjectIndex,
  type IndexedFileFingerprint
} from './project-index/sqlite-project-index'
import { analyzeProjectFile } from './project-index/tree-sitter-project-analyzer'

const MAX_FILES_PER_PROJECT = 1500
const MAX_FILE_BYTES = 512 * 1024
const MAX_INDEXED_TEXT_CHARS = 8 * 1024 * 1024
const MAX_DOCUMENT_FILE_BYTES = 20 * 1024 * 1024
const MAX_DOCUMENT_TEXT_CHARS = 600 * 1024
const INDEXED_DOCUMENT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.pdf'])

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
  '.venv',
  'node_modules',
  'bower_components',
  'coverage',
  'artifacts',
  'dist',
  'build',
  'out',
  'output',
  'playwright-report',
  'test-results',
  'target',
  'vendor',
  '__pycache__'
])

const INDEXED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.kts',
  '.swift',
  '.c',
  '.cc',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.php',
  '.rb',
  '.scala',
  '.sh',
  '.bash',
  '.zsh',
  '.sql',
  '.graphql',
  '.proto',
  '.vue',
  '.svelte',
  '.md',
  '.mdx',
  '.txt',
  '.rst',
  '.adoc',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',
  '.xml',
  '.properties'
])

const INDEXED_EXTENSIONLESS_FILES = new Set([
  'dockerfile',
  'makefile',
  'procfile',
  'gemfile',
  'rakefile',
  'readme',
  'license'
])

const IGNORED_FILE_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'credentials.json',
  'secrets.json',
  'id_rsa',
  'id_ed25519',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'poetry.lock',
  'cargo.lock'
])

const IGNORED_SECRET_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.keystore', '.jks'])

export interface ProjectIndexingStats {
  parsedFiles: number
  reusedFiles: number
  treeSitterFiles: number
  fallbackFiles: number
}

interface IndexedProjectResult {
  project: ProjectKnowledgeProject
  files: IndexedFileFingerprint[]
  stats: ProjectIndexingStats
}

export class ProjectKnowledgeService {
  private readonly configuredFilePath?: string
  private readonly configuredIndexFilePath?: string
  private cachedState: ProjectKnowledgeState | null = null
  private projectIndexInstance: SqliteProjectIndex | null = null
  private projectIndexUnavailable = false
  private readonly indexingStats = new Map<string, ProjectIndexingStats>()

  constructor(filePath?: string, indexFilePath?: string) {
    this.configuredFilePath = filePath
    this.configuredIndexFilePath = indexFilePath
  }

  overview(): ProjectKnowledgeOverview {
    return projectKnowledgeOverview(this.load())
  }

  async importProject(rootPath: string, now = Date.now()): Promise<ProjectKnowledgeOverview> {
    const state = this.load()
    const projectId = stableId(`project:${resolve(rootPath)}`)
    const previous = state.projects.find((project) => project.id === projectId)
    const indexed = await this.indexProject(rootPath, now, previous)
    const project = indexed.project
    const existingIndex = state.projects.findIndex((item) => item.id === project.id)
    const projects = [...state.projects]
    if (existingIndex >= 0) projects[existingIndex] = project
    else projects.push(project)
    this.save({ ...state, projects })
    this.indexingStats.set(project.id, indexed.stats)
    this.replaceIndexedProject(project, indexed.files)
    return this.overview()
  }

  async reindexProject(projectId: string, now = Date.now()): Promise<ProjectKnowledgeOverview> {
    const state = this.load()
    const current = state.projects.find((project) => project.id === projectId)
    if (!current) throw new Error('Project not found')
    return this.importProject(current.rootPath, now)
  }

  removeProject(projectId: string): ProjectKnowledgeOverview {
    const state = this.load()
    this.save({ ...state, projects: state.projects.filter((project) => project.id !== projectId) })
    try {
      this.projectIndex?.removeProject(projectId)
    } catch (error) {
      this.disableProjectIndex(error)
    }
    this.indexingStats.delete(projectId)
    return this.overview()
  }

  lastIndexingStats(projectId: string): ProjectIndexingStats | null {
    const stats = this.indexingStats.get(projectId)
    return stats ? { ...stats } : null
  }

  close(): void {
    this.projectIndexInstance?.close()
    this.projectIndexInstance = null
  }

  async importDocument(
    filePath: string,
    role: ExternalKnowledgeRole,
    now = Date.now()
  ): Promise<ProjectKnowledgeOverview> {
    const document = await this.indexDocument(filePath, role, now)
    const state = this.load()
    const existingIndex = state.documents.findIndex((item) => item.id === document.id)
    const documents = [...state.documents]
    if (existingIndex >= 0) documents[existingIndex] = document
    else documents.push(document)
    this.save({ ...state, documents })
    return this.overview()
  }

  async reindexDocument(documentId: string, now = Date.now()): Promise<ProjectKnowledgeOverview> {
    const current = this.load().documents.find((document) => document.id === documentId)
    if (!current) throw new Error('Knowledge document not found')
    return this.importDocument(current.filePath, current.role, now)
  }

  removeDocument(documentId: string): ProjectKnowledgeOverview {
    const state = this.load()
    this.save({
      ...state,
      documents: state.documents.filter((document) => document.id !== documentId)
    })
    return this.overview()
  }

  externalSources(): ExternalKnowledgeSource[] {
    return this.load().externalSources.map((source) => ({ ...source }))
  }

  enabledExternalSources(): ExternalKnowledgeSource[] {
    return this.externalSources().filter((source) => source.enabled)
  }

  getExternalSource(sourceId: string): ExternalKnowledgeSource | null {
    const source = this.load().externalSources.find((item) => item.id === sourceId)
    return source ? { ...source } : null
  }

  saveExternalSource(
    input: ExternalKnowledgeSourceInput,
    now = Date.now()
  ): ExternalKnowledgeSource {
    const state = this.load()
    const current = input.id
      ? state.externalSources.find((source) => source.id === input.id)
      : undefined
    const id = current?.id ?? stableId(`external:${input.name}:${input.endpoint}:${now}`)
    const identityChanged = current
      ? externalSourceIdentity(current) !== externalSourceIdentity(input)
      : true
    const source: ExternalKnowledgeSource = {
      id,
      name: input.name.trim(),
      endpoint: input.endpoint.trim(),
      enabled: input.enabled,
      protocol: input.protocol,
      role: input.role,
      authType: input.authType,
      headerName: (input.headerName ?? EXTERNAL_KNOWLEDGE_DEFAULTS.headerName).trim(),
      namespace: (input.namespace ?? '').trim(),
      topK: clampNumber(input.topK, 1, 10, EXTERNAL_KNOWLEDGE_DEFAULTS.topK),
      timeoutMs: clampNumber(input.timeoutMs, 500, 8000, EXTERNAL_KNOWLEDGE_DEFAULTS.timeoutMs),
      queryField: (input.queryField ?? EXTERNAL_KNOWLEDGE_DEFAULTS.queryField).trim(),
      limitField: (input.limitField ?? EXTERNAL_KNOWLEDGE_DEFAULTS.limitField).trim(),
      namespaceField: (input.namespaceField ?? EXTERNAL_KNOWLEDGE_DEFAULTS.namespaceField).trim(),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      ...(current?.lastTest && !identityChanged ? { lastTest: { ...current.lastTest } } : {})
    }
    const externalSources = current
      ? state.externalSources.map((item) => (item.id === current.id ? source : item))
      : [...state.externalSources, source]
    this.save({ ...state, externalSources })
    return { ...source }
  }

  setExternalSourceEnabled(sourceId: string, enabled: boolean, now = Date.now()): void {
    const state = this.load()
    if (!state.externalSources.some((source) => source.id === sourceId)) {
      throw new Error('Knowledge source not found')
    }
    this.save({
      ...state,
      externalSources: state.externalSources.map((source) =>
        source.id === sourceId ? { ...source, enabled, updatedAt: now } : source
      )
    })
  }

  recordExternalSourceTest(sourceId: string, result: ExternalKnowledgeTestResult): void {
    const state = this.load()
    if (!state.externalSources.some((source) => source.id === sourceId)) {
      throw new Error('Knowledge source not found')
    }
    this.save({
      ...state,
      externalSources: state.externalSources.map((source) =>
        source.id === sourceId ? { ...source, lastTest: { ...result } } : source
      )
    })
  }

  removeExternalSource(sourceId: string): ProjectKnowledgeOverview {
    const state = this.load()
    this.save({
      ...state,
      externalSources: state.externalSources.filter((source) => source.id !== sourceId)
    })
    return this.overview()
  }

  findAnswerPolicy(question: string): InterviewAnswerPolicy | null {
    const policy = matchInterviewAnswerPolicy(this.load(), { question })
    return policy ? { ...policy } : null
  }

  saveAnswerPolicy(input: {
    id?: string
    question: string
    answer: string
    now?: number
  }): InterviewAnswerPolicy {
    const state = this.load()
    const now = input.now ?? Date.now()
    const matched = matchInterviewAnswerPolicy(state, input)
    const policyId = matched?.id ?? stableId(`policy:${input.question.trim()}:${now}`)
    const next = upsertInterviewAnswerPolicy(state, {
      ...input,
      now
    })
    this.save(next)
    const policy = next.answerPolicies.find((item) => item.id === policyId)
    if (!policy) throw new Error('Answer policy was not saved')
    return { ...policy }
  }

  deleteAnswerPolicy(policyId: string): ProjectKnowledgeOverview {
    this.save(removeInterviewAnswerPolicy(this.load(), policyId))
    return this.overview()
  }

  buildPrompt(query: string): string {
    return buildProjectKnowledgePrompt(this.retrieve(query))
  }

  retrieve(query: string): ProjectKnowledgeRetrieval {
    return this.retrieveWithLimits(query)
  }

  hasRelevantContext(query: string): boolean {
    const result = this.retrieveWithLimits(query, { policies: 1, evidence: 1 })
    return (
      result.policies.length > 0 ||
      result.evidence.length > 0 ||
      (result.materialEvidence?.length ?? 0) > 0 ||
      this.load().externalSources.some((source) => source.enabled)
    )
  }

  private retrieveWithLimits(
    query: string,
    limits: { policies?: number; evidence?: number } = {}
  ): ProjectKnowledgeRetrieval {
    const state = this.load()
    const index = this.projectIndex
    if (!index || state.projects.length === 0) return retrieveProjectKnowledge(state, query, limits)
    try {
      for (const project of state.projects) {
        if (!index.hasProject(project.id)) index.replaceProject(project, [])
      }
      const indexedEvidence = index.search(
        state.projects,
        query,
        Math.max(limits.evidence ?? 6, 24)
      )
      return retrieveProjectKnowledge(state, query, limits, indexedEvidence)
    } catch (error) {
      this.disableProjectIndex(error)
      return retrieveProjectKnowledge(state, query, limits)
    }
  }

  private async indexProject(
    rootPath: string,
    now: number,
    previous?: ProjectKnowledgeProject
  ): Promise<IndexedProjectResult> {
    const absoluteRoot = resolve(rootPath)
    const stats = statSync(absoluteRoot)
    if (!stats.isDirectory()) throw new Error('Selected path is not a directory')

    const projectId = stableId(`project:${absoluteRoot}`)
    const files = collectProjectFiles(absoluteRoot)
    const chunks: ProjectKnowledgeChunk[] = []
    const sourceFiles: ProjectSourceFile[] = []
    const indexedFiles: IndexedFileFingerprint[] = []
    const indexingStats: ProjectIndexingStats = {
      parsedFiles: 0,
      reusedFiles: 0,
      treeSitterFiles: 0,
      fallbackFiles: 0
    }
    let indexedChars = 0
    let fileCount = 0

    for (const filePath of files) {
      if (indexedChars >= MAX_INDEXED_TEXT_CHARS) break
      try {
        const fileStats = statSync(filePath)
        if (fileStats.size > MAX_FILE_BYTES) continue
        const relativePath = relative(absoluteRoot, filePath).split('\\').join('/')
        const previousChunks =
          previous?.chunks.filter((chunk) => chunk.relativePath === relativePath) ?? []
        const previousSourceFile = previous?.sourceFiles.find(
          (sourceFile) => sourceFile.relativePath === relativePath
        )
        const fingerprint = this.projectIndex?.fileFingerprint(projectId, relativePath)
        const remaining = MAX_INDEXED_TEXT_CHARS - indexedChars
        const accountedChars = Math.min(fileStats.size, remaining)

        if (
          fingerprint &&
          fingerprint.mtimeMs === fileStats.mtimeMs &&
          fingerprint.size === fileStats.size &&
          previousChunks.length > 0 &&
          previousSourceFile
        ) {
          chunks.push(...previousChunks)
          sourceFiles.push(previousSourceFile)
          indexedFiles.push({ relativePath, ...fingerprint })
          indexedChars += accountedChars
          fileCount += 1
          indexingStats.reusedFiles += 1
          continue
        }

        const buffer = readFileSync(filePath)
        if (buffer.includes(0)) continue
        const sha256 = createHash('sha256').update(buffer).digest('hex')
        if (fingerprint?.sha256 === sha256 && previousChunks.length > 0 && previousSourceFile) {
          chunks.push(...previousChunks)
          sourceFiles.push(previousSourceFile)
          indexedFiles.push({
            relativePath,
            mtimeMs: fileStats.mtimeMs,
            size: fileStats.size,
            sha256,
            language: fingerprint.language
          })
          indexedChars += accountedChars
          fileCount += 1
          indexingStats.reusedFiles += 1
          continue
        }

        const content = buffer.toString('utf8')
        const boundedContent = content.length > remaining ? content.slice(0, remaining) : content
        const analysis = await analyzeProjectFile({
          projectId,
          relativePath,
          content: boundedContent
        })
        chunks.push(...analysis.chunks)
        sourceFiles.push(analysis.sourceFile)
        indexedFiles.push({
          relativePath,
          mtimeMs: fileStats.mtimeMs,
          size: fileStats.size,
          sha256,
          language: analysis.language
        })
        indexedChars += boundedContent.length
        fileCount += 1
        indexingStats.parsedFiles += 1
        if (analysis.engine === 'tree-sitter') indexingStats.treeSitterFiles += 1
        else indexingStats.fallbackFiles += 1
      } catch {
        continue
      }
    }

    const graph = buildProjectSourceGraph(sourceFiles)
    return {
      project: {
        id: projectId,
        name: basename(absoluteRoot),
        rootPath: absoluteRoot,
        indexedAt: now,
        fileCount,
        chunks,
        sourceFiles,
        entrypoints: graph.entrypoints,
        relations: graph.relations
      },
      files: indexedFiles,
      stats: indexingStats
    }
  }

  private async indexDocument(
    filePath: string,
    role: ExternalKnowledgeRole,
    now: number
  ): Promise<ProjectKnowledgeDocument> {
    const absolutePath = resolve(filePath)
    const extension = extname(absolutePath).toLowerCase()
    if (!INDEXED_DOCUMENT_EXTENSIONS.has(extension)) {
      throw new Error('Unsupported knowledge document type')
    }
    const stats = statSync(absolutePath)
    if (!stats.isFile()) throw new Error('Selected knowledge document is not a file')
    if (stats.size > MAX_DOCUMENT_FILE_BYTES) throw new Error('Knowledge document is too large')

    const rawText =
      extension === '.pdf' ? await extractPdfText(absolutePath) : readFileSync(absolutePath, 'utf8')
    const content = rawText.slice(0, MAX_DOCUMENT_TEXT_CHARS).trim()
    if (!content) throw new Error('Knowledge document contains no extractable text')
    const id = stableId(`document:${absolutePath}`)
    return {
      id,
      name: basename(absolutePath),
      filePath: absolutePath,
      role,
      indexedAt: now,
      chunks: chunkProjectFile({
        projectId: id,
        relativePath: basename(absolutePath),
        content
      })
    }
  }

  private load(): ProjectKnowledgeState {
    if (this.cachedState) return this.cachedState
    try {
      const raw = readFileSync(this.filePath, 'utf8')
      this.cachedState = normalizeProjectKnowledgeState(JSON.parse(raw))
    } catch {
      this.cachedState = emptyProjectKnowledgeState()
    }
    return this.cachedState
  }

  private save(state: ProjectKnowledgeState): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), { mode: 0o600 })
    this.cachedState = state
  }

  private get filePath(): string {
    return this.configuredFilePath ?? join(app.getPath('userData'), 'project-knowledge.json')
  }

  private get indexFilePath(): string | null {
    if (this.configuredIndexFilePath) return this.configuredIndexFilePath
    if (!this.configuredFilePath) {
      return app?.getPath ? join(app.getPath('userData'), 'project-index.sqlite') : null
    }
    const extension = extname(this.configuredFilePath)
    const base = basename(this.configuredFilePath, extension)
    return join(dirname(this.configuredFilePath), `${base}.index.sqlite`)
  }

  private get projectIndex(): SqliteProjectIndex | null {
    if (this.projectIndexUnavailable) return null
    if (!this.projectIndexInstance) {
      const indexFilePath = this.indexFilePath
      if (!indexFilePath) return null
      const index = new SqliteProjectIndex(indexFilePath)
      if (!index.available) {
        this.projectIndexUnavailable = true
        if (index.error)
          console.warn('Project SQLite index unavailable; using legacy retrieval', index.error)
        index.close()
        return null
      }
      this.projectIndexInstance = index
    }
    return this.projectIndexInstance
  }

  private replaceIndexedProject(
    project: ProjectKnowledgeProject,
    files: IndexedFileFingerprint[]
  ): void {
    try {
      this.projectIndex?.replaceProject(project, files)
    } catch (error) {
      this.disableProjectIndex(error)
    }
  }

  private disableProjectIndex(error: unknown): void {
    console.warn('Project SQLite index failed; falling back to legacy retrieval', error)
    this.projectIndexInstance?.close()
    this.projectIndexInstance = null
    this.projectIndexUnavailable = true
  }
}

export const projectKnowledgeService = new ProjectKnowledgeService()

function collectProjectFiles(rootPath: string): string[] {
  const files: string[] = []
  const visit = (directory: string) => {
    if (files.length >= MAX_FILES_PER_PROJECT) return
    let entries: Dirent[]
    try {
      entries = readdirSync(directory, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (files.length >= MAX_FILES_PER_PROJECT) break
      if (entry.isSymbolicLink()) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) visit(path)
        continue
      }
      if (entry.isFile() && shouldIndexFile(entry.name)) files.push(path)
    }
  }
  visit(rootPath)
  return files
}

function shouldIndexFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  if (IGNORED_FILE_NAMES.has(lower) || lower.startsWith('.env.')) return false
  const extension = extname(lower)
  if (IGNORED_SECRET_EXTENSIONS.has(extension)) return false
  if (INDEXED_EXTENSIONS.has(extension)) return true
  return INDEXED_EXTENSIONLESS_FILES.has(lower)
}

async function extractPdfText(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath)
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return (Array.isArray(text) ? text.join('\n') : text).replace(/\n{3,}/g, '\n\n').trim()
}

function externalSourceIdentity(
  source: ExternalKnowledgeSource | ExternalKnowledgeSourceInput
): string {
  return JSON.stringify({
    endpoint: source.endpoint.trim(),
    protocol: source.protocol,
    authType: source.authType,
    headerName: (source.headerName ?? '').trim().toLowerCase(),
    namespace: (source.namespace ?? '').trim(),
    queryField: (source.queryField ?? '').trim(),
    limitField: (source.limitField ?? '').trim(),
    namespaceField: (source.namespaceField ?? '').trim()
  })
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}
