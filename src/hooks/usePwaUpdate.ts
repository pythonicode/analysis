import { useCallback, useSyncExternalStore } from 'react'
import {
  dismissPwaUpdate,
  getPwaUpdateAvailable,
  reloadToApplyUpdate,
  subscribePwaUpdate,
} from '../pwa'

export function usePwaUpdate() {
  const updateAvailable = useSyncExternalStore(
    subscribePwaUpdate,
    getPwaUpdateAvailable,
    () => false,
  )

  const applyUpdate = useCallback(() => {
    reloadToApplyUpdate()
  }, [])

  const dismissUpdate = useCallback(() => {
    dismissPwaUpdate()
  }, [])

  return {
    updateAvailable,
    applyUpdate,
    dismissUpdate,
  }
}
