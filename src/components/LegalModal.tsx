import { useEffect } from 'react'
import { X } from 'lucide-react'
import { LEGAL_DOCUMENTS, type LegalDocumentId } from '../content/legal'
import Portal from './Portal'

export default function LegalModal({
  documentId,
  onClose,
}: {
  documentId: LegalDocumentId
  onClose: () => void
}) {
  const doc = LEGAL_DOCUMENTS[documentId]

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal modal-legal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="legal-modal-title">{doc.title}</h2>
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="modal-body legal-body">
            <p className="legal-updated">Last updated: {doc.updated}</p>
            {doc.sections.map((section) => (
              <section key={section.heading} className="legal-section">
                <h3>{section.heading}</h3>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  )
}
