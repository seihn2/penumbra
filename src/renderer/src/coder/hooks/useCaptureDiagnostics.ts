import { useEffect, useRef, useState } from 'react'
import { setCaptureDiagnosticsListener } from '@/lib/audio-capture'

export interface CaptureDiagnostics {
  /** Seconds elapsed since transcription started (0 when not transcribing). */
  elapsedSeconds: number
  /** Total audio chunks received — rising means capture is alive. */
  chunks: number
  /** Most recent peak level [0,1] — moving means real audio, not silence. */
  level: number
}

/** Live capture diagnostics + recording timer, shared by any component that
   wants to show whether audio is actually flowing. Resets when transcription
   stops. Extracted from the old TranscriptionBar so the coach column can reuse
   it. */
export function useCaptureDiagnostics(isTranscribing: boolean): CaptureDiagnostics {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [chunks, setChunks] = useState(0)
  const [level, setLevel] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    setCaptureDiagnosticsListener((d) => {
      setChunks(d.chunks)
      setLevel(d.level)
    })
    return () => setCaptureDiagnosticsListener(null)
  }, [])

  useEffect(() => {
    if (!isTranscribing) {
      setChunks(0)
      setLevel(0)
      startTimeRef.current = null
      setElapsedSeconds(0)
      return
    }
    startTimeRef.current = Date.now()
    setElapsedSeconds(0)
    const id = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSeconds((Date.now() - startTimeRef.current) / 1000)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [isTranscribing])

  return { elapsedSeconds, chunks, level }
}

export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`
}
