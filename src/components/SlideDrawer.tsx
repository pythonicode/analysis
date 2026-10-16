import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useT } from '../i18n'

export default function SlideDrawer({
  title,
  open,
  onClose,
  children,
}: {
  title?: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const t = useT()
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="slide-drawer-backdrop" onClick={onClose}>
      <aside
        className="slide-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="slide-drawer-header">
            <h2>{title}</h2>
            <button
              type="button"
              className="slide-drawer-close"
              aria-label={t('common.close')}
              onClick={onClose}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}
        {children}
      </aside>
    </div>
  )
}
