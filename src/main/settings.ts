import { readFileSync, writeFileSync } from 'node:fs'
import { app, dialog, ipcMain, safeStorage, screen } from 'electron'
import { parseAppSettingsPatch, parseNonEmptyString } from './ipc-contracts'
import { secureSettingsStore, type SecretSettings } from './services/secure-settings-store'
import { createSecretState, maskSecret } from '../shared/secret-lifecycle'
import { isAllowedEndpoint, normalizeOrigin } from '../shared/provider-profile'
import { createActiveConfig, startDraft, editDraft, validateDraft } from '../shared/config-revision'
import { asrLog } from './asr/asr-log'
import { DEFAULT_ASR_MODEL } from '../shared/asr-models'

const secretSettingKeys = new Set<keyof SecretSettings>(['apiKey', 'dashscopeApiKey'])
let secretsLoaded = false

ipcMain.handle('getAppSettings', () => {
  hydrateSecretSettings()
  return settings
})

// Validate a candidate AI base URL (P0#13): report whether it's an allowed
// HTTPS origin (localhost exempt) and its normalized origin, so the settings UI
// can warn before saving instead of failing silently at request time.
ipcMain.handle('get-endpoint-validity', (_event, url: unknown) => {
  const endpoint = typeof url === 'string' ? url : ''
  return { allowed: isAllowedEndpoint(endpoint), origin: normalizeOrigin(endpoint) }
})

// Validate a proposed settings patch atomically before applying (P0#12): run it
// as a config-revision draft through field validators and report ALL errors, so
// the settings UI can block an invalid change instead of half-applying it.
ipcMain.handle('validate-settings-patch', (_event, patch: unknown) => {
  const edits = (patch ?? {}) as Record<string, unknown>
  let draft = startDraft(createActiveConfig({}))
  for (const [field, value] of Object.entries(edits)) {
    draft = editDraft(draft, field, value)
  }
  const result = validateDraft(draft, {
    apiBaseURL: (v) =>
      v == null || v === '' || (typeof v === 'string' && isAllowedEndpoint(v))
        ? null
        : '必须是 https 地址',
    assistDebounceMs: (v) =>
      v == null || (typeof v === 'number' && v >= 200 && v <= 10000)
        ? null
        : '防抖时间需在 200–10000ms 之间'
  })
  return result.ok ? { ok: true } : { ok: false, errors: result.errors }
})

// Return only the four-state phase + masked suffix per secret (P0#14), so the
// renderer can show "已保存 ····7F3A" without ever receiving the full key.
ipcMain.handle('get-secret-status', () => {
  hydrateSecretSettings()
  const statusOf = (raw: string) =>
    raw ? createSecretState(true, maskSecret(raw)) : createSecretState(false)
  return {
    apiKey: statusOf(settings.apiKey),
    dashscopeApiKey: statusOf(settings.dashscopeApiKey)
  }
})

ipcMain.handle('updateAppSettings', (_event, value) => {
  const _settings = parseAppSettingsPatch(value)
  const secretPatch = pickSecretSettings(_settings)

  if (Object.keys(secretPatch).length > 0) {
    Object.assign(settings, secureSettingsStore.save(secretPatch))
  }

  Object.assign(settings, _settings)
  if ('hideDockIcon' in _settings) {
    applyDockVisibility(settings.hideDockIcon)
  }
  if ('contentProtectionEnabled' in _settings) {
    global.mainWindow?.setContentProtection(settings.contentProtectionEnabled !== false)
  }
})

function hydrateSecretSettings(): void {
  if (secretsLoaded) return

  const storedSecrets = secureSettingsStore.load()
  asrLog('hydrateSecretSettings', {
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    loadedApiKeyLen: storedSecrets.apiKey.length,
    loadedDashscopeLen: storedSecrets.dashscopeApiKey.length,
    settingsApiKeyLen: settings.apiKey.length,
    settingsDashscopeLen: settings.dashscopeApiKey.length
  })
  if (!settings.apiKey) settings.apiKey = storedSecrets.apiKey
  if (!settings.dashscopeApiKey) settings.dashscopeApiKey = storedSecrets.dashscopeApiKey
  secretsLoaded = true
}

function pickSecretSettings(value: Partial<AppSettings>): Partial<SecretSettings> {
  const secrets: Partial<SecretSettings> = {}

  for (const key of secretSettingKeys) {
    if (key in value) secrets[key] = value[key]
  }

  return secrets
}

/** Show/hide the macOS dock icon. No-op on other platforms. */
export function applyDockVisibility(hidden: boolean): void {
  if (process.platform !== 'darwin') return
  if (hidden) {
    app.dock?.hide()
  } else {
    app.dock?.show()
  }
}

// Enumerate attached displays so the settings UI can offer a screenshot-target
// picker (multi-monitor). Marks the primary and gives each a friendly label.
ipcMain.handle('list-displays', () => {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d, index) => ({
    id: String(d.id),
    label: `显示器 ${index + 1} (${d.size.width}×${d.size.height})`,
    primary: d.id === primaryId
  }))
})

ipcMain.handle('selectScreenshotDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择截图保存目录'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

const MAX_MEMORY_FILE_BYTES = 200 * 1024
// Cap the PDF we attempt to parse so a huge file can't stall the main process.
const MAX_PDF_FILE_BYTES = 20 * 1024 * 1024

/** Extract plain text from a PDF buffer using unpdf. Returns '' on failure or
   when the PDF has no extractable text layer (e.g. scanned images). */
async function extractPdfText(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath)
  if (buffer.byteLength > MAX_PDF_FILE_BYTES) {
    throw new Error('PDF too large')
  }
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return (Array.isArray(text) ? text.join('\n') : text).replace(/\n{3,}/g, '\n\n').trim()
}

/** Open a picker for a plain-text/markdown/PDF file and return its text. Used to
   import user background material (e.g. a résumé) into the userMemory setting. */
ipcMain.handle('selectAndReadTextFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择材料文件',
    filters: [{ name: 'Documents', extensions: ['txt', 'md', 'markdown', 'text', 'pdf'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const filePath = result.filePaths[0]
  try {
    const content = filePath.toLowerCase().endsWith('.pdf')
      ? await extractPdfText(filePath)
      : readFileSync(filePath, 'utf-8')
    return content.length > MAX_MEMORY_FILE_BYTES
      ? content.slice(0, MAX_MEMORY_FILE_BYTES)
      : content
  } catch {
    return null
  }
})

/** Save the rendered conversation markdown to a user-chosen file. `kind`
   selects the default filename so an exported interview record is easy to tell
   apart from a plain conversation export. */
ipcMain.handle('exportConversationMarkdown', async (_event, value, kind) => {
  const markdown = parseNonEmptyString(value)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const prefix = kind === 'interview' ? 'penumbra-interview' : 'penumbra-conversation'
  const result = await dialog.showSaveDialog({
    title: '导出对话',
    defaultPath: `${prefix}-${stamp}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (result.canceled || !result.filePath) return false

  try {
    writeFileSync(result.filePath, markdown, 'utf-8')
    return true
  } catch {
    return false
  }
})

export const settings = {
  apiBaseURL: process.env.API_BASE_URL || '',
  apiKey: process.env.API_KEY || '',
  model: process.env.MODEL || '',
  codeLanguage: process.env.CODE_LANGUAGE || 'typescript',
  customPrompt: '',
  promptPreset: 'default',
  appMode: 'algorithm',
  userMemory: '',
  screenshotAutoSave: false,
  screenshotDir: '',
  // Which display to screenshot (a screen display id as a string). Empty = the
  // primary display. Lets multi-monitor users target the screen showing the
  // coding problem instead of always capturing the primary.
  screenshotDisplayId: '',
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || '',
  asrModel: process.env.ASR_MODEL || DEFAULT_ASR_MODEL,
  interviewCoachEnabled: true,
  realtimeAssistEnabled: false,
  proactiveAssistEnabled: false,
  memoryDistillEnabled: false,
  assistDebounceMs: 1500,
  dualSourceTranscriptionEnabled: false,
  speakerDiarizationMode: 'heuristic',
  transcriptionLanguage: 'auto',
  translationEnabled: false,
  translationTargetLanguage: 'zh',
  hideDockIcon: false,
  // Local sensitive-info firewall: when on (default), text is scrubbed of
  // secrets/PII (and the user's never-send words) before being sent to the AI.
  redactBeforeSend: true,
  // Newline-separated words/phrases the user never wants sent to the model.
  neverSendList: '',
  // Screen-capture stealth (the app's core "invisible during screen share"
  // feature). Default ON. If it ever renders the window invisible to the user
  // too (a macOS 26 quirk seen right after granting Screen Recording), the user
  // can disable it in Settings → Privacy, or press Alt+0 to reset the window.
  contentProtectionEnabled: true
}

export type AppSettings = typeof settings
