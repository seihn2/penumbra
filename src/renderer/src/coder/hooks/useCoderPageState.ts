import { useEffect } from 'react'
import { useSyncAppState } from '@/lib/store/app'

export function useCoderPageState(): void {
  const syncAppState = useSyncAppState()

  useEffect(() => {
    window.api.updateAppState({ inCoderPage: true })
    return () => {
      window.api.updateAppState({ inCoderPage: false })
    }
  }, [])

  useEffect(() => {
    window.api.onSyncAppState((state) => {
      syncAppState(state)
    })
    return () => {
      window.api.removeSyncAppStateListener()
    }
  }, [syncAppState])
}
