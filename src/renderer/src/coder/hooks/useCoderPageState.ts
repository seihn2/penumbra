import { useEffect } from 'react'
import { useSyncAppState } from '@/lib/store/app'

export function useCoderPageState(): void {
  const syncAppState = useSyncAppState()

  useEffect(() => {
    window.api.onSyncAppState((state) => {
      syncAppState(state)
    })
    void window.api.updateAppState({ inCoderPage: true }).then(syncAppState)
    return () => {
      void window.api.updateAppState({ inCoderPage: false })
      window.api.removeSyncAppStateListener()
    }
  }, [syncAppState])
}
