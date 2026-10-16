import { RefreshCw, X } from 'lucide-react'
import { usePwaUpdate } from '../hooks/usePwaUpdate'
import { useT } from '../i18n'

export default function PwaUpdateBanner() {
  const t = useT()
  const { updateAvailable, applyUpdate, dismissUpdate } = usePwaUpdate()

  if (!updateAvailable) return null

  return (
    <div className="pwa-update-banner" role="alert">
      <RefreshCw size={16} aria-hidden />
      <span>{t('pwa.updateAvailable')}</span>
      <button
        type="button"
        className="button button-primary pwa-update-banner-action"
        onClick={applyUpdate}
      >
        {t('pwa.updateNow')}
      </button>
      <button
        type="button"
        className="pwa-update-banner-dismiss"
        aria-label={t('pwa.dismissUpdate')}
        onClick={dismissUpdate}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
