import { readFileSync, writeFileSync } from 'node:fs'
import { dialog, ipcMain, safeStorage, screen } from 'electron'
import {
  parseAnswerServiceCredentialRef,
  parseAnswerServiceKeyWrite,
  parseAnswerServiceProfileActivation,
  parseAppSettingsPatch,
  parseNonEmptyString
} from './ipc-contracts'
import { secureSettingsStore, type SecretSettings } from './services/secure-settings-store'
import { createSecretState, maskSecret } from '../shared/secret-lifecycle'
import { isAllowedEndpoint, normalizeOrigin } from '../shared/provider-profile'
import { DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF } from '../shared/answer-service-profile'
import { createActiveConfig, startDraft, editDraft, validateDraft } from '../shared/config-revision'
import { asrLog } from './asr/asr-log'
import { DEFAULT_ASR_MODEL } from '../shared/asr-models'
import { applyTrafficLightMode, applyZeroUiWindowAppearance } from './services/window-appearance'
import { setOverlayDockVisibility } from './services/window-overlay'
import { DEFAULT_ANSWER_API_PROTOCOL } from '../shared/answer-api-protocol'
import { DEFAULT_TRAFFIC_LIGHT_MODE } from '../shared/traffic-light-mode'

const secretSettingKeys = new Set<keyof SecretSettings>(['apiKey', 'dashscopeApiKey'])
let secretsLoaded = false
let activeAnswerServiceCredentialRef = DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF

ipcMain.handle('getAppSettings', () => {
  hydrateSecretSettings()
  // The active answer-service key stays main-process-only. Renderer code gets
  // its configured/masked state through the profile-specific IPC below.
  return { ...settings, apiKey: '' }
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
  return {
    apiKey: secretStatus(settings.apiKey),
    dashscopeApiKey: secretStatus(settings.dashscopeApiKey)
  }
})

ipcMain.handle('activate-answer-service-profile', (_event, value) => {
  hydrateSecretSettings()
  const profile = parseAnswerServiceProfileActivation(value)
  activeAnswerServiceCredentialRef = profile.credentialRef
  settings.apiBaseURL = profile.endpoint
  settings.model = profile.model
  settings.answerApiProtocol = profile.protocol
  settings.apiKey = answerServiceKeyFor(profile.credentialRef)
  return { keyStatus: secretStatus(settings.apiKey) }
})

ipcMain.handle('get-answer-service-key-status', (_event, value) => {
  hydrateSecretSettings()
  const credentialRef = parseAnswerServiceCredentialRef(value)
  return secretStatus(answerServiceKeyFor(credentialRef))
})

ipcMain.handle('save-answer-service-key', (_event, value) => {
  hydrateSecretSettings()
  const { credentialRef, key } = parseAnswerServiceKeyWrite(value)
  secureSettingsStore.saveAnswerServiceKey(credentialRef, key)
  if (activeAnswerServiceCredentialRef === credentialRef) settings.apiKey = key
  return secretStatus(key)
})

ipcMain.handle('delete-answer-service-key', (_event, value) => {
  hydrateSecretSettings()
  const credentialRef = parseAnswerServiceCredentialRef(value)
  secureSettingsStore.deleteAnswerServiceKey(credentialRef)
  if (activeAnswerServiceCredentialRef === credentialRef) settings.apiKey = ''
  return createSecretState(false)
})

ipcMain.handle('updateAppSettings', (_event, value) => {
  const _settings = parseAppSettingsPatch(value)
  const secretPatch = pickSecretSettings(_settings)

  if (typeof secretPatch.apiKey === 'string') {
    secureSettingsStore.saveAnswerServiceKey(
      DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF,
      secretPatch.apiKey
    )
    if (activeAnswerServiceCredentialRef === DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF) {
      settings.apiKey = secretPatch.apiKey
    }
  }
  if (typeof secretPatch.dashscopeApiKey === 'string') {
    const saved = secureSettingsStore.save({ dashscopeApiKey: secretPatch.dashscopeApiKey })
    settings.dashscopeApiKey = saved.dashscopeApiKey
  }

  const nonSecretSettings = { ..._settings }
  delete nonSecretSettings.apiKey
  delete nonSecretSettings.dashscopeApiKey
  Object.assign(settings, nonSecretSettings)
  if ('hideDockIcon' in _settings) {
    applyDockVisibility(settings.hideDockIcon)
  }
  if (('trafficLightMode' in _settings || 'zeroUiMode' in _settings) && global.mainWindow) {
    applyTrafficLightMode(
      global.mainWindow,
      settings.zeroUiMode ? 'hidden' : settings.trafficLightMode
    )
    applyZeroUiWindowAppearance(global.mainWindow, settings.zeroUiMode)
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
    answerServiceKeyCount: Object.keys(storedSecrets.answerServiceKeys).length,
    loadedDashscopeLen: storedSecrets.dashscopeApiKey.length,
    settingsApiKeyLen: settings.apiKey.length,
    settingsDashscopeLen: settings.dashscopeApiKey.length
  })
  if (!settings.apiKey) {
    settings.apiKey =
      storedSecrets.answerServiceKeys[DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF] ?? storedSecrets.apiKey
  }
  if (!settings.dashscopeApiKey) settings.dashscopeApiKey = storedSecrets.dashscopeApiKey
  secretsLoaded = true
}

function answerServiceKeyFor(credentialRef: string): string {
  const stored = secureSettingsStore.getAnswerServiceKey(credentialRef)
  if (stored) return stored
  if (credentialRef === DEFAULT_ANSWER_SERVICE_CREDENTIAL_REF) {
    return process.env.API_KEY || ''
  }
  return ''
}

function secretStatus(raw: string) {
  return raw ? createSecretState(true, maskSecret(raw)) : createSecretState(false)
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
  setOverlayDockVisibility(hidden, global.mainWindow)
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
  answerApiProtocol: DEFAULT_ANSWER_API_PROTOCOL,
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
  trafficLightMode: DEFAULT_TRAFFIC_LIGHT_MODE,
  // Zero UI strips the overlay down to assistant output rendered as plain
  // preformatted text. It is mirrored in main so the global shortcut can
  // toggle it even while the renderer exposes no controls.
  zeroUiMode: false,
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
