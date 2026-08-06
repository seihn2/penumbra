import { appendFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

// Append-only diagnostic log so the packaged app's transcription pipeline can
// be inspected post-hoc (the packaged app has no visible console). Path is
// printed once so it's easy to find: <userData>/penumbra-asr.log.
let logPath: string | null = null

// Cap the log so long-running sessions can't grow it without bound. When it
// exceeds this, the next write starts a fresh file (most recent context is the
// useful part for diagnostics).
const MAX_LOG_BYTES = 512 * 1024

function resolvePath(): string {
  if (!logPath) {
    logPath = join(app.getPath('userData'), 'penumbra-asr.log')
  }
  return logPath
}

export function asrLog(message: string, extra?: Record<string, unknown>): void {
  try {
    const path = resolvePath()
    const line = extra ? `${message} ${JSON.stringify(extra)}` : message
    // Timestamp via Date is fine in the main process (not a workflow script).
    const entry = `[${new Date().toISOString()}] ${line}\n`
    let size = 0
    try {
      size = statSync(path).size
    } catch {
      // File doesn't exist yet; size stays 0.
    }
    if (size > MAX_LOG_BYTES) {
      writeFileSync(path, entry)
    } else {
      appendFileSync(path, entry)
    }
  } catch {
    // Never let diagnostics break the pipeline.
  }
}

export function asrLogPath(): string {
  return resolvePath()
}
