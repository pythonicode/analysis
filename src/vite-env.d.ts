/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}

interface Window {
  stonks?: {
    event: (
      name: string,
      pathOrProps?: string | Record<string, string>,
      props?: Record<string, string>,
    ) => void
  }
}
