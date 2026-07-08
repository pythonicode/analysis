import { useCallback, useEffect, useState } from 'react'

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsInstalled(event.matches)
    }

    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const onAppInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    mediaQuery.addEventListener('change', onDisplayModeChange)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      mediaQuery.removeEventListener('change', onDisplayModeChange)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt) return false

    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    setInstallPrompt(null)

    if (outcome === 'accepted') {
      setIsInstalled(true)
      return true
    }

    return false
  }, [installPrompt])

  return {
    canInstall: installPrompt !== null && !isInstalled,
    isInstalled,
    install,
  }
}
