import { useCallback, useSyncExternalStore } from 'react'
import { AnalyticsEvents, trackEvent } from '../analytics'
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
    trackEvent(AnalyticsEvents.APP_UPDATE)
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
