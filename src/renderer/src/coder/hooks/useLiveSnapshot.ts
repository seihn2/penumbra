import { useEffect, useState } from 'react'
import { createLiveSnapshot, type LiveSessionSnapshot } from '../../../../shared/live-session-state'

// While transcribing, the live phase can change without any coach-updated event
// (e.g. an assist finishes → hasReadyAnswer flips). Poll the main-owned snapshot
// on a light interval so the capsule reflects the real state. Stops polling when
// not transcribing to avoid needless IPC.
const POLL_MS = 1000

/** Poll the main process for the live-session snapshot while a session is
   active. Returns an idle snapshot when not transcribing. */
export function useLiveSnapshot(isTranscribing: boolean): LiveSessionSnapshot {
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(createLiveSnapshot)

  useEffect(() => {
    if (!isTranscribing) {
      setSnapshot(createLiveSnapshot())
      return
    }
    let cancelled = false
    const poll = (): void => {
      window.api.getLiveState().then((live) => {
        if (!cancelled) setSnapshot(live)
      })
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isTranscribing])

  return snapshot
}
