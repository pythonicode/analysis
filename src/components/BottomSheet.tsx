import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useT } from '../i18n'

export default function BottomSheet({
  title,
  onClose,
  children,
  className,
}: {
  title?: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  const t = useT()
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEscapeKey(onClose)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const focusable = sheet.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()
  }, [])

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className={`bottom-sheet${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-handle" aria-hidden />
        {title && (
          <div className="bottom-sheet-header">
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              className="bottom-sheet-close"
              aria-label={t('common.close')}
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        )}
        <div className="bottom-sheet-body">{children}</div>
      </div>
    </div>
  )
}
