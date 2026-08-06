import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppSettings } from '../main/settings'
import type { AppState } from '../main/state'
import type { InterviewCoachState } from '../shared/interview-coach'
import type { CheckResult, SelfCheckVerdict } from '../shared/self-check'
import type { LiveSessionSnapshot } from '../shared/live-session-state'
import type { DebriefReport } from '../shared/debrief-report'
import type { DualAudioState } from '../shared/audio-source-machine'
import { parseClaims, type Claim } from '../shared/answer-provenance'
import type { SoakReport } from '../shared/soak-health'

type TranslationPayload = {
  sourceText: string
  translatedText: string
  targetLanguage: string
  timestamp: number
}

// Custom APIs for renderer
const api = {
  // Get app settings
  getAppSettings: () => ipcRenderer.invoke('getAppSettings'),
  // Update app settings
  updateAppSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('updateAppSettings', settings),

  // Update app state
  updateAppState: (state: Partial<AppState>) => ipcRenderer.invoke('updateAppState', state),
  // Set native window opacity (whole window)
  setWindowOpacity: (value: number) => ipcRenderer.invoke('setWindowOpacity', value),
  // Listen for opacity adjustment from global shortcuts
  onAdjustOpacity: (
    callback: (payload: { target: 'overall' | 'window' | 'text'; delta: number }) => void
  ) => {
    ipcRenderer.on('adjust-opacity', (_event, payload) => callback(payload))
  },
  removeAdjustOpacityListener: () => {
    ipcRenderer.removeAllListeners('adjust-opacity')
  },
  // Listen for app state
  onSyncAppState: (callback: (state: AppState) => void) => {
    ipcRenderer.on('sync-app-state', (_event, state) => {
      callback(state)
    })
  },
  // Remove app state listener
  removeSyncAppStateListener: () => {
    ipcRenderer.removeAllListeners('sync-app-state')
  },

  // Content-protection (stealth) toggled via global shortcut
  onContentProtectionChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('content-protection-changed', (_event, enabled: boolean) => callback(enabled))
  },
  removeContentProtectionChangedListener: () => {
    ipcRenderer.removeAllListeners('content-protection-changed')
  },

  // In-app (content-protected) auto-update UI — no native dialogs, which would
  // leak into a screen share.
  onUpdateAvailable: (callback: (payload: { version?: string }) => void) => {
    ipcRenderer.on('update-available', (_event, payload) => callback(payload))
  },
  onUpdateProgress: (callback: (payload: { percent: number }) => void) => {
    ipcRenderer.on('update-progress', (_event, payload) => callback(payload))
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback)
  },
  onUpdateError: (callback: (payload: { message: string }) => void) => {
    ipcRenderer.on('update-error', (_event, payload) => callback(payload))
  },
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
    ipcRenderer.removeAllListeners('update-error')
  },
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Init shortcuts
  initShortcuts: (shortcuts: Record<string, { action: string; key: string }>) =>
    ipcRenderer.invoke('initShortcuts', shortcuts) as Promise<{ action: string; status: string }[]>,
  // Get shortcuts
  getShortcuts: () => ipcRenderer.invoke('getShortcuts'),
  // Update shortcuts
  updateShortcuts: (shortcuts: { action: string; key: string }[]) =>
    ipcRenderer.invoke('updateShortcuts', shortcuts) as Promise<
      { action: string; status: string }[]
    >,

  // Listen for screenshot events
  onScreenshotTaken: (callback: (screenshotData: string) => void) => {
    ipcRenderer.on('screenshot-taken', (_event, screenshotData) => {
      callback(screenshotData)
    })
  },
  // Remove screenshot listener
  removeScreenshotListener: () => {
    ipcRenderer.removeAllListeners('screenshot-taken')
  },

  // Listen for solution chunks
  onSolutionChunk: (callback: (chunk: string) => void) => {
    ipcRenderer.on('solution-chunk', (_event, chunk) => {
      callback(chunk)
    })
  },
  // Remove solution chunk listener
  removeSolutionChunkListener: () => {
    ipcRenderer.removeAllListeners('solution-chunk')
  },

  // Stop solution stream
  stopSolutionStream: () => ipcRenderer.invoke('stopSolutionStream'),

  // Test the AI model connection (baseURL/key/model)
  testAiConnection: () =>
    ipcRenderer.invoke('test-ai-connection') as Promise<{ ok: boolean; error?: string }>,

  // Fetch the platform's available models from the /models endpoint
  fetchAvailableModels: () =>
    ipcRenderer.invoke('fetch-available-models') as Promise<{
      ok: boolean
      models?: string[]
      error?: string
    }>,

  // Mock-interview practice mode: AI interviewer question generation + scoring.
  generateMockQuestion: (input: {
    track: string
    difficulty: string
    history: string
    isFollowUp: boolean
  }) => ipcRenderer.invoke('generate-mock-question', input) as Promise<string>,
  scoreMockAnswer: (input: { question: string; answer: string }) =>
    ipcRenderer.invoke('score-mock-answer', input) as Promise<{
      structure: number
      evidence: number
      clarity: number
      feedback: string
    } | null>,

  // Break an AI answer into provenance-tagged claims (facts vs assumptions vs
  // inferences). Parses the model's raw JSON with the pure answer-provenance
  // helper so the renderer receives typed Claims (empty on any failure).
  tagAnswerProvenance: async (answer: string): Promise<Claim[]> => {
    const raw = (await ipcRenderer.invoke('tag-answer-provenance', answer)) as string
    return parseClaims(raw)
  },

  // Open the macOS Screen Recording privacy settings pane
  openScreenRecordingSettings: () =>
    ipcRenderer.invoke('open-screen-recording-settings') as Promise<void>,

  // Write a line to the ASR diagnostics log (renderer has no fs access)
  asrDebugLog: (message: string) => ipcRenderer.send('asr-debug-log', message),

  // Clear the current conversation (abort stream, reset history, clear UI)
  clearConversation: () => ipcRenderer.invoke('clearConversation'),

  // Retry generating a solution for the current conversation
  retryLastSolution: () => ipcRenderer.invoke('retryLastSolution'),

  // Map a structured problem to the minimal reset scope + auto-continue flag.
  getRecoveryScope: (problem: Record<string, boolean>) =>
    ipcRenderer.invoke('get-recovery-scope', problem) as Promise<{
      scope: string | null
      canContinue: boolean
    }>,

  // Data-egress center: read the body-free outbound receipt log and the
  // active per-domain egress capsule (what's leaving the machine, to where).
  getOutboundLog: () => ipcRenderer.invoke('get-outbound-log'),
  getActiveEgress: () =>
    ipcRenderer.invoke('get-active-egress') as Promise<Record<string, string[]>>,

  // Four-state secret status per key (phase + masked suffix only, never raw).
  getSecretStatus: () => ipcRenderer.invoke('get-secret-status'),

  // Per-session usage/cost (request count + approx tokens per task).
  getSessionCost: () => ipcRenderer.invoke('get-session-cost'),

  // Soak / quality benchmark (P2#46): opt-in periodic health sampling + an
  // evaluated pass/degraded/fail report over the captured series.
  startSoakSampling: () => ipcRenderer.invoke('start-soak-sampling'),
  stopSoakSampling: () => ipcRenderer.invoke('stop-soak-sampling'),
  getSoakReport: () =>
    ipcRenderer.invoke('get-soak-report') as Promise<SoakReport & { sampling: boolean }>,

  // Validate a candidate AI base URL (allowed HTTPS origin + normalized origin).
  getEndpointValidity: (url: string) =>
    ipcRenderer.invoke('get-endpoint-validity', url) as Promise<{
      allowed: boolean
      origin: string
    }>,

  // Atomically validate a settings patch before applying (all errors reported).
  validateSettingsPatch: (patch: Record<string, unknown>) =>
    ipcRenderer.invoke('validate-settings-patch', patch) as Promise<{
      ok: boolean
      errors?: { field: string; message: string }[]
    }>,

  // A human-readable summary of what the AI "remembers this request".
  getContextManifest: () => ipcRenderer.invoke('get-context-manifest') as Promise<string>,

  // Build a post-interview debrief (复盘) report from the coach timeline.
  getDebriefReport: () => ipcRenderer.invoke('get-debrief-report') as Promise<DebriefReport>,

  // One-tap "don't use my profile this session" gate (memory withheld from AI).
  setProfileSessionEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('set-profile-session-enabled', enabled) as Promise<boolean>,
  getProfileSessionEnabled: () =>
    ipcRenderer.invoke('get-profile-session-enabled') as Promise<boolean>,

  // Run the one-click pre-interview self-check (AI vision+streaming, screenshot,
  // ASR, shortcuts, network) and get per-check results + an overall verdict.
  runSelfCheck: () =>
    ipcRenderer.invoke('run-self-check') as Promise<{
      checks: CheckResult[]
      verdict: SelfCheckVerdict
    }>,

  // Start a new conversation from plain text (no screenshot)
  startTextConversation: (text: string) =>
    ipcRenderer.invoke('startTextConversation', text) as Promise<{
      success: boolean
      error?: string
    }>,

  // Rebuild main-process conversation context from a restored history session
  restoreConversation: (messages: { role: 'user' | 'assistant'; text: string }[]) =>
    ipcRenderer.invoke('restoreConversation', messages),

  // Send follow-up question
  sendFollowUpQuestion: (question: string) =>
    ipcRenderer.invoke('sendFollowUpQuestion', question) as Promise<{
      success: boolean
      error?: string
    }>,

  // Listen for solution completion
  onSolutionComplete: (callback: () => void) => {
    ipcRenderer.on('solution-complete', callback)
  },
  removeSolutionCompleteListener: () => {
    ipcRenderer.removeAllListeners('solution-complete')
  },

  onSolutionStopped: (callback: () => void) => {
    ipcRenderer.on('solution-stopped', callback)
  },
  removeSolutionStoppedListener: () => {
    ipcRenderer.removeAllListeners('solution-stopped')
  },

  onSolutionError: (callback: (message: string) => void) => {
    ipcRenderer.on('solution-error', (_event, message) => {
      callback(message)
    })
  },
  removeSolutionErrorListener: () => {
    ipcRenderer.removeAllListeners('solution-error')
  },

  // Listen for scroll page up
  onScrollPageUp: (callback: () => void) => {
    ipcRenderer.on('scroll-page-up', callback)
  },
  // Remove scroll page up listener
  removeScrollPageUpListener: () => {
    ipcRenderer.removeAllListeners('scroll-page-up')
  },

  // Listen for screenshots-updated (gallery)
  onScreenshotsUpdated: (callback: (screenshots: string[]) => void) => {
    ipcRenderer.on('screenshots-updated', (_event, screenshots) => {
      callback(screenshots)
    })
  },
  removeScreenshotsUpdatedListener: () => {
    ipcRenderer.removeAllListeners('screenshots-updated')
  },

  // Listen for scroll page down
  onScrollPageDown: (callback: () => void) => {
    ipcRenderer.on('scroll-page-down', callback)
  },
  // Remove scroll page down listener
  removeScrollPageDownListener: () => {
    ipcRenderer.removeAllListeners('scroll-page-down')
  },

  // Listen for copy-latest-answer (global shortcut, hands-free copy)
  onCopyLatestAnswer: (callback: () => void) => {
    ipcRenderer.on('copy-latest-answer', callback)
  },
  removeCopyLatestAnswerListener: () => {
    ipcRenderer.removeAllListeners('copy-latest-answer')
  },

  // AI loading events
  onAiLoadingStart: (callback: () => void) => {
    ipcRenderer.on('ai-loading-start', callback)
  },
  onAiLoadingEnd: (callback: () => void) => {
    ipcRenderer.on('ai-loading-end', callback)
  },
  removeAiLoadingStartListener: () => {
    ipcRenderer.removeAllListeners('ai-loading-start')
  },
  removeAiLoadingEndListener: () => {
    ipcRenderer.removeAllListeners('ai-loading-end')
  },

  // Solution clear event (new session)
  onSolutionClear: (callback: () => void) => {
    ipcRenderer.on('solution-clear', callback)
  },
  removeSolutionClearListener: () => {
    ipcRenderer.removeAllListeners('solution-clear')
  },

  // Reset only the solution panel (keep chat messages) — text conversation start
  onSolutionResetPanel: (callback: () => void) => {
    ipcRenderer.on('solution-reset-panel', callback)
  },
  removeSolutionResetPanelListener: () => {
    ipcRenderer.removeAllListeners('solution-reset-panel')
  },

  // Retry reset: drop failed assistant bubble + reset panel, keep history
  onSolutionRetryReset: (callback: () => void) => {
    ipcRenderer.on('solution-retry-reset', callback)
  },
  removeSolutionRetryResetListener: () => {
    ipcRenderer.removeAllListeners('solution-retry-reset')
  },

  // Select screenshot save directory
  selectScreenshotDir: () => ipcRenderer.invoke('selectScreenshotDir') as Promise<string | null>,

  // List attached displays for the screenshot-target picker (multi-monitor)
  listDisplays: () =>
    ipcRenderer.invoke('list-displays') as Promise<
      { id: string; label: string; primary: boolean }[]
    >,

  // Select and read a plain-text/markdown file (for user memory material)
  selectAndReadTextFile: () =>
    ipcRenderer.invoke('selectAndReadTextFile') as Promise<string | null>,

  // Export the current conversation as a markdown file
  exportConversationMarkdown: (markdown: string, kind?: 'conversation' | 'interview') =>
    ipcRenderer.invoke('exportConversationMarkdown', markdown, kind) as Promise<boolean>,

  // Transcription
  startTranscription: (apiKey: string) => ipcRenderer.invoke('start-transcription', apiKey),
  startTranscriptionSource: (source: 'system' | 'microphone', apiKey: string) =>
    ipcRenderer.invoke('start-transcription-source', source, apiKey),
  stopTranscription: () => ipcRenderer.invoke('stop-transcription'),
  sendTranscriptionAudioChunk: (chunk: ArrayBuffer) =>
    ipcRenderer.send('transcription-audio-chunk', chunk),
  sendTranscriptionAudioSourceChunk: (source: 'system' | 'microphone', chunk: ArrayBuffer) =>
    ipcRenderer.send('transcription-audio-source-chunk', source, chunk),
  getTranscriptionText: () => ipcRenderer.invoke('get-transcription-text') as Promise<string>,

  // Fetch the live-session snapshot on mount/reload so the renderer recovers the
  // real main-process state (transcription survives renderer reloads).
  getLiveState: () => ipcRenderer.invoke('get-live-state') as Promise<LiveSessionSnapshot>,
  clearTranscriptionText: () => ipcRenderer.invoke('clear-transcription-text'),
  testTranscriptionConnection: (apiKey: string, model: string) =>
    ipcRenderer.invoke('test-transcription-connection', apiKey, model) as Promise<{
      ok: boolean
      error?: string
    }>,

  onToggleTranscription: (callback: () => void) => {
    ipcRenderer.on('toggle-transcription', callback)
  },
  removeToggleTranscriptionListener: () => {
    ipcRenderer.removeAllListeners('toggle-transcription')
  },
  onTranscriptionText: (callback: (data: { text: string; isPartial: boolean }) => void) => {
    ipcRenderer.on('transcription-text', (_event, data) => callback(data))
  },
  removeTranscriptionTextListener: () => {
    ipcRenderer.removeAllListeners('transcription-text')
  },
  onTranscriptionError: (callback: (message: string) => void) => {
    ipcRenderer.on('transcription-error', (_event, message) => callback(message))
  },
  removeTranscriptionErrorListener: () => {
    ipcRenderer.removeAllListeners('transcription-error')
  },
  onTranscriptionStopped: (callback: () => void) => {
    ipcRenderer.on('transcription-stopped', callback)
  },
  removeTranscriptionStoppedListener: () => {
    ipcRenderer.removeAllListeners('transcription-stopped')
  },
  // Per-source audio reliability state (system + microphone), pushed on every
  // connect/disconnect so the renderer can raise a single attention event when
  // the app goes fully deaf (vs. a single-source blip).
  onAudioStatus: (callback: (state: DualAudioState) => void) => {
    ipcRenderer.on('audio-status', (_event, state) => callback(state))
  },
  removeAudioStatusListener: () => {
    ipcRenderer.removeAllListeners('audio-status')
  },
  onTranscriptionCleared: (callback: () => void) => {
    ipcRenderer.on('transcription-cleared', callback)
  },
  removeTranscriptionClearedListener: () => {
    ipcRenderer.removeAllListeners('transcription-cleared')
  },
  // Full coaching-session clear (interview ended): wipe timeline/assists/summary
  onTranscriptionSessionCleared: (callback: () => void) => {
    ipcRenderer.on('transcription-session-cleared', callback)
  },
  removeTranscriptionSessionClearedListener: () => {
    ipcRenderer.removeAllListeners('transcription-session-cleared')
  },
  onTranscriptionTranslation: (callback: (payload: TranslationPayload) => void) => {
    ipcRenderer.on('transcription-translation', (_event, payload) => callback(payload))
  },
  removeTranscriptionTranslationListener: () => {
    ipcRenderer.removeAllListeners('transcription-translation')
  },
  onTranscriptionTranslationError: (callback: (message: string) => void) => {
    ipcRenderer.on('transcription-translation-error', (_event, message) => callback(message))
  },
  removeTranscriptionTranslationErrorListener: () => {
    ipcRenderer.removeAllListeners('transcription-translation-error')
  },
  onInterviewCoachUpdated: (callback: (state: InterviewCoachState) => void) => {
    ipcRenderer.on('interview-coach-updated', (_event, state) => callback(state))
  },
  removeInterviewCoachUpdatedListener: () => {
    ipcRenderer.removeAllListeners('interview-coach-updated')
  },
  // Real-time AI assist + topic summary
  requestInterviewAssist: () => ipcRenderer.invoke('request-interview-assist'),
  onInterviewAssistLoading: (
    callback: (payload: { question: string; timestamp: number }) => void
  ) => {
    ipcRenderer.on('interview-assist-loading', (_event, payload) => callback(payload))
  },
  onInterviewAssistChunk: (
    callback: (payload: { question: string; points: string; timestamp: number }) => void
  ) => {
    ipcRenderer.on('interview-assist-chunk', (_event, payload) => callback(payload))
  },
  onInterviewAssist: (
    callback: (payload: { question: string; points: string; timestamp: number }) => void
  ) => {
    ipcRenderer.on('interview-assist', (_event, payload) => callback(payload))
  },
  onInterviewAssistError: (callback: () => void) => {
    ipcRenderer.on('interview-assist-error', callback)
  },
  onInterviewSummary: (callback: (payload: { summary: string; timestamp: number }) => void) => {
    ipcRenderer.on('interview-summary', (_event, payload) => callback(payload))
  },
  onMemoryCandidates: (
    callback: (payload: {
      candidates: { field: string; text: string }[]
      timestamp: number
    }) => void
  ) => {
    ipcRenderer.on('memory-candidates', (_event, payload) => callback(payload))
  },
  removeInterviewAssistListeners: () => {
    ipcRenderer.removeAllListeners('interview-assist-loading')
    ipcRenderer.removeAllListeners('interview-assist-chunk')
    ipcRenderer.removeAllListeners('interview-assist')
    ipcRenderer.removeAllListeners('interview-assist-error')
    ipcRenderer.removeAllListeners('interview-summary')
    ipcRenderer.removeAllListeners('memory-candidates')
  }
}

export type MainAPI = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
