import { registerSW } from 'virtual:pwa-register'

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined
let updateAvailable = false
const listeners = new Set<() => void>()

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

function setUpdateAvailable(value: boolean): void {
  if (updateAvailable === value) return
  updateAvailable = value
  notifyListeners()
}

export function subscribePwaUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPwaUpdateAvailable(): boolean {
  return updateAvailable
}

export function dismissPwaUpdate(): void {
  setUpdateAvailable(false)
}

/** Registers the service worker and notifies the UI when a new build is ready. */
export function initServiceWorker(): void {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      setUpdateAvailable(true)
    },
  })
}

/** Activates the waiting service worker and reloads the page. */
export function reloadToApplyUpdate(): void {
  void applyUpdate?.(true)
}
