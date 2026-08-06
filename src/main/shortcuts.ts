import { globalShortcut, ipcMain, shell, screen } from 'electron'
import { takeScreenshot } from './take-screenshot'
import { saveScreenshotToDisk } from './save-screenshot'
import {
  getSolutionStream,
  getFollowUpStream,
  getGeneralStream,
  testAiConnection,
  fetchAvailableModels,
  probeVisionStream,
  generateMockQuestion,
  scoreMockAnswer,
  tagAnswerProvenance
} from './ai'
import { state } from './state'
import { settings } from './settings'
import {
  getTranscriptionText,
  clearTranscriptionText,
  endTranscriptionSession
} from './transcription'
import { hideOrShowWindow, moveWindowBy, snapWindowTo } from './services/window-controller'
import { StreamManager } from './services/stream-manager'
import { AiConversationService } from './services/ai-conversation-service'
import { recordEgress } from './outbound-log'
import {
  parseNonEmptyString,
  parseRestoreMessages,
  parseShortcutsArray,
  parseShortcutsRecord
} from './ipc-contracts'
import { getShortcutRegistrationKeys } from '../shared/shortcut-keys'
import { detectConflicts } from '../shared/shortcut-scope'
import { asrLog } from './asr/asr-log'
import { probeAsrConnection } from './asr/probe'
import { aggregateSelfCheck, type CheckResult } from '../shared/self-check'
import { evaluateControl } from '../shared/config-dependency'
import {
  minimalScopeFor,
  canContinueAfterFix,
  type RecoverableProblem
} from '../shared/recovery-plan'

type Shortcut = {
  action: string
  key: string
  status: ShortcutStatus
  registeredKeys: string[]
}

enum ShortcutStatus {
  Registered = 'registered',
  Failed = 'failed',
  /** Shortcut is available to register but not registered. */
  Available = 'available'
}

const shortcuts: Record<string, Shortcut> = {}

const SCREENSHOT_FAILED_MESSAGE =
  '截图失败，请检查屏幕录制权限（macOS：系统设置 › 隐私与安全性 › 屏幕录制）'

const streamManager = new StreamManager()
const aiConversation = new AiConversationService()

const callbacks: Record<string, () => void> = {
  hideOrShowMainWindow: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    hideOrShowWindow(mainWindow)
  },

  resetWindow: () => {
    // Recovery hatch: if the window ever becomes invisible (off-screen, fully
    // transparent), force it back to a visible, centered, opaque state. Centering
    // goes through the shared, clamp-safe spatial-presets math so a multi-display
    // setup recovers onto the current display's work area.
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.setOpacity(1)
    snapWindowTo(mainWindow, 'center')
    mainWindow.show()
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    mainWindow.webContents.send('reset-window-appearance')
  },

  takeScreenshot: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) return

    streamManager.abort('new-request')
    let loadingStarted = false
    const screenshotData = await takeScreenshot()
    if (screenshotData && mainWindow && !mainWindow.isDestroyed()) {
      saveScreenshotToDisk(screenshotData)
      const transcriptionText = getTranscriptionText()
      if (transcriptionText) {
        clearTranscriptionText()
        mainWindow.webContents.send('transcription-cleared')
      }
      aiConversation.startWithScreenshot(screenshotData, transcriptionText)

      const streamContext = streamManager.createContext()
      mainWindow.webContents.send('solution-clear')
      mainWindow.webContents.send('screenshots-updated', aiConversation.getRecentScreenshots())
      mainWindow.webContents.send('screenshot-taken', screenshotData)
      mainWindow.webContents.send('ai-loading-start')
      loadingStarted = true
      recordEgress({
        categories: transcriptionText
          ? ['screenshot', 'transcript', 'prompt']
          : ['screenshot', 'prompt'],
        reason: 'solution',
        approxBytes: screenshotData.length + transcriptionText.length,
        outcome: 'success',
        at: Date.now()
      })
      await streamManager.runTextStream({
        window: mainWindow,
        streamContext,
        createStream: (signal) => getSolutionStream(aiConversation.getMessages(), signal),
        errorPrefix: 'Error streaming solution:',
        onComplete: (assistantResponse) => {
          if (assistantResponse) {
            aiConversation.appendAssistantResponse(assistantResponse)
          }
        },
        onFinally: () => {
          if (loadingStarted && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-loading-end')
          }
        }
      })
    } else if (!screenshotData && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('solution-error', SCREENSHOT_FAILED_MESSAGE)
    }
  },

  // Append screenshot for continuous capture (if conversation exists)
  appendScreenshot: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) return

    // Fallback to first screenshot if no conversation
    if (!aiConversation.hasConversation()) {
      callbacks.takeScreenshot()
      return
    }

    streamManager.abort('new-request')
    let loadingStarted = false

    const screenshotData = await takeScreenshot()
    if (screenshotData && mainWindow && !mainWindow.isDestroyed()) {
      saveScreenshotToDisk(screenshotData)
      const transcriptionText = getTranscriptionText()
      if (transcriptionText) {
        clearTranscriptionText()
        mainWindow.webContents.send('transcription-cleared')
      }
      aiConversation.appendScreenshot(screenshotData, transcriptionText)

      const streamContext = streamManager.createContext()

      mainWindow.webContents.send('screenshot-taken', screenshotData)
      mainWindow.webContents.send('screenshots-updated', aiConversation.getRecentScreenshots())
      mainWindow.webContents.send('solution-chunk', aiConversation.consumeAppendSeparator())
      mainWindow.webContents.send('ai-loading-start')
      loadingStarted = true
      recordEgress({
        categories: transcriptionText
          ? ['screenshot', 'transcript', 'prompt']
          : ['screenshot', 'prompt'],
        reason: 'solution-append',
        approxBytes: screenshotData.length + transcriptionText.length,
        outcome: 'success',
        at: Date.now()
      })
      await streamManager.runTextStream({
        window: mainWindow,
        streamContext,
        createStream: (signal) => getGeneralStream(aiConversation.getMessages(), signal),
        errorPrefix: 'Error streaming continuous solution:',
        onComplete: (assistantResponse) => {
          if (assistantResponse) {
            aiConversation.appendAssistantResponse(assistantResponse)
          }
        },
        onFinally: () => {
          if (loadingStarted && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-loading-end')
          }
        }
      })
    } else if (!screenshotData && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('solution-error', SCREENSHOT_FAILED_MESSAGE)
    }
  },

  // Stop current AI solution stream
  stopSolutionStream: () => {
    streamManager.abort('user')
  },

  ignoreOrEnableMouse: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    state.ignoreMouse = !state.ignoreMouse
    // forward:true keeps move events flowing (for hover) while clicks pass
    // through to whatever is behind the window — required for real passthrough.
    if (state.ignoreMouse) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
    } else {
      mainWindow.setIgnoreMouseEvents(false)
    }
    mainWindow.webContents.send('sync-app-state', state)
  },
  toggleContentProtection: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    // Flip the stealth (screen-capture invisibility) flag, apply it to the live
    // window, and push the new value so the settings toggle stays in sync.
    const next = settings.contentProtectionEnabled === false
    settings.contentProtectionEnabled = next
    mainWindow.setContentProtection(next)
    mainWindow.webContents.send('content-protection-changed', next)
  },
  pageUp: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('scroll-page-up')
  },

  pageDown: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('scroll-page-down')
  },

  copyLatestAnswer: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('copy-latest-answer')
  },

  moveMainWindowUp: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    moveWindowBy(mainWindow, 'up')
  },

  moveMainWindowDown: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    moveWindowBy(mainWindow, 'down')
  },

  moveMainWindowLeft: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    moveWindowBy(mainWindow, 'left')
  },

  moveMainWindowRight: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    moveWindowBy(mainWindow, 'right')
  },

  toggleTranscription: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('toggle-transcription')
  },

  clearTranscription: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    clearTranscriptionText()
    mainWindow.webContents.send('transcription-cleared')
  },

  increaseOverallOpacity: () => sendOpacityAdjust('overall', 0.05),
  decreaseOverallOpacity: () => sendOpacityAdjust('overall', -0.05),
  increaseWindowOpacity: () => sendOpacityAdjust('window', 0.05),
  decreaseWindowOpacity: () => sendOpacityAdjust('window', -0.05),
  increaseTextOpacity: () => sendOpacityAdjust('text', 0.05),
  decreaseTextOpacity: () => sendOpacityAdjust('text', -0.05)
}

function sendOpacityAdjust(target: 'overall' | 'window' | 'text', delta: number) {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('adjust-opacity', { target, delta })
}

function unregisterShortcut(action: string) {
  const shortcut = shortcuts[action]
  if (!shortcut) return
  if (shortcut.registeredKeys.length) {
    shortcut.registeredKeys.forEach((registeredKey) => {
      globalShortcut.unregister(registeredKey)
    })
  } else {
    globalShortcut.unregister(shortcut.key)
  }
  shortcut.status = ShortcutStatus.Available
  shortcut.registeredKeys = []
}

function registerShortcut(action: string, key: string) {
  if (shortcuts[action]) {
    unregisterShortcut(action)
  }

  const keysToRegister = getShortcutRegistrationKeys(key, process.platform)
  const registeredKeys: string[] = []
  keysToRegister.forEach((shortcutKey) => {
    if (globalShortcut.register(shortcutKey, callbacks[action])) {
      registeredKeys.push(shortcutKey)
    }
  })

  const conflicts = detectConflicts(key)
  if (conflicts.length > 0) {
    asrLog('shortcut-conflict', { action, key, apps: conflicts })
  }

  shortcuts[action] = {
    action,
    key,
    status: registeredKeys.length ? ShortcutStatus.Registered : ShortcutStatus.Failed,
    registeredKeys
  }
}

ipcMain.handle('getShortcuts', () => shortcuts)

function getShortcutStatuses(): { action: string; status: ShortcutStatus }[] {
  return Object.values(shortcuts).map(({ action, status }) => ({ action, status }))
}

ipcMain.handle('initShortcuts', (_event, value) => {
  const shortcutMap = parseShortcutsRecord(value)
  Object.entries(shortcutMap).forEach(([action, { key }]) => {
    registerShortcut(action, key)
  })
  return getShortcutStatuses()
})

ipcMain.handle('updateShortcuts', (_event, value) => {
  const _shortcuts = parseShortcutsArray(value)
  _shortcuts.forEach((shortcut) => {
    if (shortcuts[shortcut.action]?.key !== shortcut.key) {
      registerShortcut(shortcut.action, shortcut.key)
    }
  })
  return getShortcutStatuses()
})

ipcMain.handle('stopSolutionStream', () => {
  if (!streamManager.hasActiveStream()) return false
  streamManager.abort('user')
  return true
})

ipcMain.handle('test-ai-connection', () => {
  return testAiConnection()
})

// Open the macOS Screen Recording privacy pane so users can grant the
// permission that screenshots and system-audio transcription both require.
ipcMain.handle('open-screen-recording-settings', () => {
  if (process.platform === 'darwin') {
    return shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    )
  }
  return Promise.resolve()
})

ipcMain.handle('fetch-available-models', () => {
  return fetchAvailableModels()
})

// Mock-interview practice mode: generate the next question (empty string on
// failure so the renderer falls back to the deterministic bank) and score an
// answer (null on failure → renderer skips the score).
ipcMain.handle('generate-mock-question', (_event, input) => {
  const value = (input ?? {}) as Record<string, unknown>
  return generateMockQuestion({
    track: typeof value.track === 'string' ? value.track : 'behavioral',
    difficulty: typeof value.difficulty === 'string' ? value.difficulty : 'medium',
    history: typeof value.history === 'string' ? value.history : '',
    isFollowUp: value.isFollowUp === true
  })
})

ipcMain.handle('score-mock-answer', (_event, input) => {
  const value = (input ?? {}) as Record<string, unknown>
  return scoreMockAnswer({
    question: typeof value.question === 'string' ? value.question : '',
    answer: typeof value.answer === 'string' ? value.answer : ''
  })
})

// Break an AI answer into provenance-tagged claims (returns raw model JSON; the
// renderer parses it with the pure answer-provenance.parseClaims).
ipcMain.handle('tag-answer-provenance', (_event, answer) => {
  return tagAnswerProvenance(typeof answer === 'string' ? answer : '')
})

ipcMain.handle('clearConversation', () => {
  streamManager.abort('user')
  aiConversation.reset()
  // The interview is over: end the whole coaching session (pending transcript
  // + coach timeline/assists/summary/proactive), not just the pending text.
  endTranscriptionSession()
  const mainWindow = global.mainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('solution-clear')
    mainWindow.webContents.send('screenshots-updated', [])
    mainWindow.webContents.send('transcription-session-cleared')
  }
  return true
})

ipcMain.handle('run-self-check', async () => {
  const checks: CheckResult[] = []

  // 1. AI vision + streaming — the core capability. Critical.
  if (!settings.apiKey) {
    checks.push({ id: 'ai', status: 'fail', critical: true, detail: 'no-key' })
  } else {
    const vision = await probeVisionStream()
    if (!vision.ok) {
      checks.push({ id: 'ai', status: 'fail', critical: true, detail: vision.error })
    } else if (!vision.streamed) {
      // Model answered but didn't stream — usable but degraded (no live typing).
      checks.push({ id: 'ai', status: 'warn', critical: false, detail: 'no-stream' })
    } else {
      checks.push({ id: 'ai', status: 'pass', critical: true, detail: `${vision.latencyMs}ms` })
    }
    // 2. Network latency, derived from the same probe's time-to-first-chunk.
    if (vision.ok && typeof vision.latencyMs === 'number') {
      const slow = vision.latencyMs > 6000
      checks.push({
        id: 'network',
        status: slow ? 'warn' : 'pass',
        critical: false,
        detail: `${vision.latencyMs}ms`
      })
    }
  }

  // 3. Screenshot capture — critical (no screenshot, no problem-solving).
  try {
    const shot = await takeScreenshot()
    const displays = screen.getAllDisplays().length
    if (shot && shot.length > 0) {
      checks.push({
        id: 'screenshot',
        status: 'pass',
        critical: true,
        detail: displays > 1 ? `multi-display:${displays}` : 'ok'
      })
    } else {
      checks.push({ id: 'screenshot', status: 'fail', critical: true, detail: 'empty' })
    }
  } catch {
    checks.push({ id: 'screenshot', status: 'fail', critical: true, detail: 'permission' })
  }

  // 4. ASR — non-critical (interview coach degrades gracefully without it).
  if (!settings.dashscopeApiKey) {
    checks.push({ id: 'asr', status: 'skip', critical: false, detail: 'no-key' })
  } else {
    const asr = await probeAsrConnection(settings.dashscopeApiKey, settings.asrModel)
    checks.push({
      id: 'asr',
      status: asr.ok ? 'pass' : 'fail',
      critical: false,
      detail: asr.error
    })
  }

  // 5. Key shortcuts registered — non-critical (window still usable via UI).
  const statuses = getShortcutStatuses()
  const failed = statuses.filter((s) => s.status === ShortcutStatus.Failed)
  checks.push({
    id: 'shortcuts',
    status: failed.length > 0 ? 'warn' : 'pass',
    critical: false,
    detail: failed.length > 0 ? failed.map((s) => s.action).join(',') : 'ok'
  })

  // 6. Config dependencies — flag features toggled on without their required
  //    key, so nothing is silently "on but non-functional" (P0#15).
  const depSettings: Record<string, unknown> = {
    apiKey: settings.apiKey,
    dashscopeApiKey: settings.dashscopeApiKey,
    translationEnabled: settings.translationEnabled,
    realtimeAssistEnabled: settings.realtimeAssistEnabled,
    proactiveAssistEnabled: settings.proactiveAssistEnabled
  }
  const depSpecs = [
    { id: 'translationEnabled', requires: ['apiKey'] },
    { id: 'realtimeAssistEnabled', requires: ['apiKey', 'dashscopeApiKey'] },
    { id: 'proactiveAssistEnabled', requires: ['apiKey', 'dashscopeApiKey'] }
  ]
  const brokenDeps = depSpecs
    .filter((spec) => settings[spec.id as keyof typeof settings])
    .filter((spec) => evaluateControl(spec, depSettings) === 'missing-dependency')
    .map((spec) => spec.id)
  checks.push({
    id: 'dependencies',
    status: brokenDeps.length > 0 ? 'warn' : 'pass',
    critical: false,
    detail: brokenDeps.length > 0 ? brokenDeps.join(',') : 'ok'
  })

  const verdict = aggregateSelfCheck(checks)
  return { checks, verdict }
})

// Given a structured problem, return the cheapest reset scope that fixes it and
// whether the original task can auto-continue afterward (P0#23 layered reset).
ipcMain.handle('get-recovery-scope', (_event, problem: unknown) => {
  const p = (problem ?? {}) as RecoverableProblem
  const scope = minimalScopeFor(p)
  return { scope, canContinue: scope ? canContinueAfterFix(p, scope) : true }
})

ipcMain.handle('restoreConversation', (_event, value) => {
  const messages = parseRestoreMessages(value)
  streamManager.abort('user')
  aiConversation.restoreFromMessages(messages)
  return true
})

ipcMain.handle('startTextConversation', async (_event, value) => {
  const text = parseNonEmptyString(value).trim()
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) {
    return { success: false, error: 'Invalid state' }
  }

  streamManager.abort('new-request')
  aiConversation.startWithText(text)
  const streamContext = streamManager.createContext()
  // Reset only the solution panel — the renderer already added the user's
  // first-question bubble optimistically; a full clear would wipe it.
  mainWindow.webContents.send('solution-reset-panel')
  mainWindow.webContents.send('ai-loading-start')

  await streamManager.runTextStream({
    window: mainWindow,
    streamContext,
    createStream: (signal) => getSolutionStream(aiConversation.getMessages(), signal),
    errorPrefix: 'Error streaming text solution:',
    onComplete: (assistantResponse) => {
      if (assistantResponse) aiConversation.appendAssistantResponse(assistantResponse)
    },
    onFinally: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai-loading-end')
      }
    }
  })

  return { success: true }
})

ipcMain.handle('retryLastSolution', async () => {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) {
    return { success: false, error: 'Invalid state' }
  }
  if (!aiConversation.hasConversation()) {
    return { success: false, error: 'No active conversation' }
  }

  streamManager.abort('new-request')
  const streamContext = streamManager.createContext()
  // Keep the conversation history; just drop the failed answer and reset the
  // panel so the retried answer replaces the error instead of wiping history.
  mainWindow.webContents.send('solution-retry-reset')
  mainWindow.webContents.send('ai-loading-start')

  await streamManager.runTextStream({
    window: mainWindow,
    streamContext,
    createStream: (signal) => getGeneralStream(aiConversation.getMessages(), signal),
    errorPrefix: 'Error retrying solution:',
    onComplete: (assistantResponse) => {
      if (assistantResponse) aiConversation.appendAssistantResponse(assistantResponse)
    },
    onFinally: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai-loading-end')
      }
    }
  })

  return { success: true }
})

ipcMain.handle('sendFollowUpQuestion', async (_event, value) => {
  const question = parseNonEmptyString(value).trim()
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) {
    return { success: false, error: 'Invalid state' }
  }

  // Validate that there's an active conversation
  if (!aiConversation.hasConversation()) {
    return { success: false, error: 'No active conversation' }
  }

  streamManager.abort('new-request')
  const streamContext = streamManager.createContext()

  // Add a separator before the follow-up response
  mainWindow.webContents.send('solution-chunk', '\n\n---\n\n')

  await streamManager.runTextStream({
    window: mainWindow,
    streamContext,
    createStream: (signal) => getFollowUpStream(aiConversation.getMessages(), question, signal),
    errorPrefix: 'Error streaming follow-up solution:',
    onComplete: (assistantResponse) => {
      aiConversation.appendFollowUp(question, assistantResponse)
    }
  })

  return { success: true }
})
