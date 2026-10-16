import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../store'
import { useT } from '../i18n'

export default function ToastBanner() {
  const t = useT()
  const message = useAppStore((s) => s.toastMessage)
  const setToastMessage = useAppStore((s) => s.setToastMessage)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setToastMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [message, setToastMessage])

  if (!message) return null

  return (
    <div className="toast-banner" role="status">
      <span>{message}</span>
      <button
        type="button"
        className="toast-banner-dismiss"
        aria-label={t('common.dismiss')}
        onClick={() => setToastMessage(null)}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
