/** One Dollar Stats custom events — https://docs.onedollarstats.com/send-events */

export const AnalyticsEvents = {
  ADVERTISEMENT_CLICK: 'advertisement_click',
  EXPORT_PNG: 'export_png',
  SAVE_PROJECT: 'save_project',
  OPEN_PROJECT: 'open_project',
  IMPORT_IMAGE: 'import_image',
  IMPORT_GPX: 'import_gpx',
  NEW_PROJECT: 'new_project',
  OPEN_SAMPLE_PROJECT: 'open_sample_project',
  INSTALL_APP: 'install_app',
  APP_UPDATE: 'app_update',
} as const

type EventProps = Record<string, string | number | boolean>

function toStringProps(props: EventProps): Record<string, string> {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, String(value)]),
  )
}

/** Sends a custom event when the One Dollar Stats script is loaded. */
export function trackEvent(name: string, props?: EventProps): void {
  if (typeof window === 'undefined' || !window.stonks?.event) return

  if (props) {
    window.stonks.event(name, toStringProps(props))
    return
  }

  window.stonks.event(name)
}
