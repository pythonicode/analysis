import { RefreshCw, X } from 'lucide-react'
import { usePwaUpdate } from '../hooks/usePwaUpdate'

export default function PwaUpdateBanner() {
  const { updateAvailable, applyUpdate, dismissUpdate } = usePwaUpdate()

  if (!updateAvailable) return null

  return (
    <div className="pwa-update-banner" role="alert">
      <RefreshCw size={16} aria-hidden />
      <span>A new version of O-Analysis is available.</span>
      <button
        type="button"
        className="button button-primary pwa-update-banner-action"
        onClick={applyUpdate}
      >
        Update now
      </button>
      <button
        type="button"
        className="pwa-update-banner-dismiss"
        aria-label="Dismiss update notice"
        onClick={dismissUpdate}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
