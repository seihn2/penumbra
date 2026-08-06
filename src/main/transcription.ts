import { ipcMain } from 'electron'
import { createAsrProvider } from './asr/provider-factory'
import { probeAsrConnection } from './asr/probe'
import type { AsrProvider, AsrSentenceEvent, AudioSourceRole } from './asr/types'
import { InterviewCoachService } from './services/interview-coach-service'
import { TranscriptBuffer } from './transcript-buffer'
import { settings } from './settings'
import { parseAudioSourceRole, parseNonEmptyString } from './ipc-contracts'
import { asrLog } from './asr/asr-log'
import type { AudioSourceStatus, LiveSessionSnapshot } from '../shared/live-session-state'
import { transcriptionLanguageHints } from '../shared/languages'
import {
  createDualAudioState,
  onConnecting,
  onConnected,
  onDisconnected,
  shouldEmitFullStop,
  type DualAudioState,
  type DisconnectReason
} from '../shared/audio-source-machine'

const transcript = new TranscriptBuffer()

// When the current live session started (ms), or null when not transcribing.
// Owned here in the main process so a renderer reload can recover the real
// elapsed time instead of resetting to zero.
let sessionStartedAt: number | null = null

// The most recent session's start/end (ms), preserved after the session stops
// so a post-interview debrief requested later still has the real timing.
let lastSessionStart: number | null = null
let lastSessionEnd: number | null = null

// Per-source audio reliability state (system + microphone), driven by the
// tested audio-source-machine reducer.
let audioState: DualAudioState = createDualAudioState()

function pushAudioStatus(): void {
  sendToRenderer('audio-status', audioState)
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  const mainWindow = global.mainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

// Providers are built for the configured model's wire protocol. They're
// rebuilt when the model changes (see ensureProviderForModel) so switching
// between the legacy run-task models and the realtime model just works.
const asrProviders: Record<AudioSourceRole, AsrProvider> = {
  system: createAsrProvider(settings.asrModel),
  microphone: createAsrProvider(settings.asrModel)
}
const providerBuiltForModel: Record<AudioSourceRole, string> = {
  system: settings.asrModel,
  microphone: settings.asrModel
}

/** Swap in a provider matching the current model if it changed since this
   source's provider was built. Safe to call before each start; a no-op when
   unchanged. Never rebuilds a running provider (a mid-session model change is
   ignored until the next start). */
function ensureProviderForModel(source: AudioSourceRole) {
  if (settings.asrModel === providerBuiltForModel[source]) return
  if (asrProviders[source].isRunning()) return
  asrProviders[source] = createAsrProvider(settings.asrModel)
  providerBuiltForModel[source] = settings.asrModel
}
const interviewCoachService = new InterviewCoachService(sendToRenderer)

/** Full session reset: clears the pending transcript AND the coach timeline,
   assists, summary, and proactive loop. Use only when the whole interview
   session ends (e.g. clearConversation), not when merely consuming the
   pending transcript into a screenshot request. */
function resetSession() {
  transcript.reset()
  interviewCoachService.reset()
}

/** Clear only the pending (unsent) transcript text. The coach session — its
   timeline, answer points, summary, and proactive loop — keeps running, so
   taking a screenshot or clearing the pending transcript mid-interview does
   not wipe the live coaching context. */
function clearPendingTranscript() {
  transcript.reset()
}

function getProviderSpeaker(source: AudioSourceRole) {
  return source === 'microphone' ? 'candidate' : 'interviewer'
}

function handleSentence(source: AudioSourceRole, event: AsrSentenceEvent) {
  const enrichedEvent: AsrSentenceEvent = {
    ...event,
    providerSpeaker: event.providerSpeaker ?? getProviderSpeaker(source)
  }

  transcript.add(source, event.text, event.isPartial, settings.dualSourceTranscriptionEnabled)

  interviewCoachService.handleSentence(enrichedEvent)
  sendToRenderer('transcription-text', {
    text: getTranscriptionText(),
    isPartial: event.isPartial
  })
}

function hasRunningProvider() {
  return Object.values(asrProviders).some((provider) => provider.isRunning())
}

function classifyAsrDisconnect(message: string): DisconnectReason {
  const m = message.toLowerCase()
  if (m.includes('无声') || m.includes('no sound') || m.includes('no audio')) return 'no-sound'
  if (m.includes('未授权') || m.includes('denied') || m.includes('unauthorized'))
    return 'unauthorized'
  if (m.includes('设备') || m.includes('device')) return 'device-disconnected'
  if (m.includes('拒绝') || m.includes('rejected') || m.includes('quota')) return 'asr-rejected'
  return 'network'
}

function startProvider(source: AudioSourceRole, apiKey: string) {
  ensureProviderForModel(source)
  const provider = asrProviders[source]
  if (provider.isRunning()) return

  audioState = onConnecting(audioState, source, Date.now())
  pushAudioStatus()

  provider.start(
    {
      apiKey,
      model: settings.asrModel,
      languageHints: transcriptionLanguageHints(settings.transcriptionLanguage)
    },
    {
      onStarted: () => {
        audioState = onConnected(audioState, source, Date.now())
        pushAudioStatus()
      },
      onSentence: (event) => handleSentence(source, event),
      onError: (message) => {
        sendToRenderer('transcription-error', message)
        audioState = onDisconnected(audioState, source, {
          reason: classifyAsrDisconnect(message),
          now: Date.now()
        })
        pushAudioStatus()
        // Only signal a full stop when neither source is still working, so an
        // error on one channel doesn't kill a healthy parallel one.
        if (shouldEmitFullStop(audioState)) sendToRenderer('transcription-stopped')
      },
      onFinished: () => {
        audioState = onDisconnected(audioState, source, { reason: 'network', now: Date.now() })
        pushAudioStatus()
        if (!hasRunningProvider()) sendToRenderer('transcription-stopped')
      }
    }
  )
}

function startTranscription(apiKey: string) {
  if (hasRunningProvider()) return

  resetSession()
  sessionStartedAt = Date.now()
  lastSessionStart = sessionStartedAt
  lastSessionEnd = null
  startProvider('system', apiKey)
  interviewCoachService.startProactive()
}

function startTranscriptionSource(source: AudioSourceRole, apiKey: string) {
  asrLog('startTranscriptionSource', { source, hasKey: Boolean(apiKey) })
  if (!hasRunningProvider()) {
    resetSession()
    sessionStartedAt = Date.now()
    lastSessionStart = sessionStartedAt
    lastSessionEnd = null
  }
  startProvider(source, apiKey)
  interviewCoachService.startProactive()
}

function stopTranscription() {
  if (!hasRunningProvider()) return
  Object.values(asrProviders).forEach((provider) => provider.stop())
  lastSessionEnd = Date.now()
  sessionStartedAt = null
  // Cancel any in-flight/pending AI assist, translation trigger, and the
  // proactive loop so nothing pops up after the user ends the session. The
  // accumulated transcript/assists are kept (still viewable + exportable).
  interviewCoachService.stopInFlightWork()
  sendToRenderer('transcription-stopped')
}

function handleAudioChunk(source: AudioSourceRole, chunk: ArrayBuffer) {
  asrProviders[source].sendAudioChunk(chunk)
}

export function getTranscriptionText(): string {
  return transcript.getText(settings.dualSourceTranscriptionEnabled)
}

/** Build the live-session snapshot the renderer fetches on mount/reload so it
   recovers the real main-process state (transcription can outlive a renderer
   reload or route change — it does not belong to any React page). */
function buildLiveSnapshot(): LiveSessionSnapshot {
  const statusOf = (source: AudioSourceRole): AudioSourceStatus =>
    asrProviders[source].isRunning() ? 'live' : 'idle'
  return {
    active: hasRunningProvider(),
    audio: { system: statusOf('system'), microphone: statusOf('microphone') },
    assistInFlight: interviewCoachService.isAssistInFlight(),
    hasReadyAnswer: interviewCoachService.hasReadyAnswerNow(),
    candidateSpeaking: interviewCoachService.isCandidateSpeaking(),
    startedAt: sessionStartedAt
  }
}

/** Live coach signals for the soak sampler (P2#46): whether an assist is stuck
   in-flight and how many finalized turns have accumulated. */
export function getSoakSignals(): { assistInFlight: boolean; turns: number } {
  return {
    assistInFlight: interviewCoachService.isAssistInFlight(),
    turns: interviewCoachService.turnCount()
  }
}

/** Clear only the pending transcript text (coach session keeps running).
   Called after a screenshot consumes the transcript, or by the clear-transcript
   shortcut — neither should wipe the live coaching timeline. */
export function clearTranscriptionText() {
  clearPendingTranscript()
}

/** End the whole coaching session: clears the pending transcript and resets the
   coach timeline/assists/summary/proactive loop. Used when the conversation is
   cleared, i.e. the interview is over. */
export function endTranscriptionSession() {
  resetSession()
}

ipcMain.handle('start-transcription', (_event, value) => {
  const apiKey = parseNonEmptyString(value)
  startTranscription(apiKey)
})

ipcMain.handle('start-transcription-source', (_event, sourceValue, apiKeyValue) => {
  const source = parseAudioSourceRole(sourceValue)
  const apiKey = parseNonEmptyString(apiKeyValue)
  startTranscriptionSource(source, apiKey)
})

ipcMain.handle('stop-transcription', () => {
  stopTranscription()
})

ipcMain.on('asr-debug-log', (_event, message: unknown) => {
  asrLog(`renderer: ${typeof message === 'string' ? message : JSON.stringify(message)}`)
})

ipcMain.on('transcription-audio-chunk', (_event, chunk: ArrayBuffer) => {
  handleAudioChunk('system', chunk)
})

ipcMain.on('transcription-audio-source-chunk', (_event, sourceValue, chunk: ArrayBuffer) => {
  const source = parseAudioSourceRole(sourceValue)
  handleAudioChunk(source, chunk)
})

ipcMain.handle('get-transcription-text', () => {
  return getTranscriptionText()
})

ipcMain.handle('get-live-state', () => {
  return buildLiveSnapshot()
})

ipcMain.handle('clear-transcription-text', () => {
  clearTranscriptionText()
})

ipcMain.handle('test-transcription-connection', (_event, apiKeyValue, modelValue) => {
  const apiKey = parseNonEmptyString(apiKeyValue)
  const model = parseNonEmptyString(modelValue)
  return probeAsrConnection(apiKey, model)
})

ipcMain.handle('request-interview-assist', () => {
  interviewCoachService.requestAssistNow()
})

ipcMain.handle('get-context-manifest', () => {
  return interviewCoachService.buildContextManifest()
})

// Build a post-interview debrief (复盘) report from the accumulated coach
// timeline. Uses the live session clock while transcribing, otherwise the most
// recently finished session's start/end so a debrief opened after the interview
// still reflects the real elapsed time.
ipcMain.handle('get-debrief-report', () => {
  const start = sessionStartedAt ?? lastSessionStart ?? 0
  const end = sessionStartedAt !== null ? Date.now() : (lastSessionEnd ?? start)
  return interviewCoachService.buildDebriefReport(start, end)
})
