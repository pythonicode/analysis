import { X } from 'lucide-react'
import { LEGAL_DOCUMENTS, type LegalDocumentId } from '../content/legal'
import Portal from './Portal'
import { useT } from '../i18n'
import { useEscapeKey } from '../hooks/useEscapeKey'

export default function LegalModal({
  documentId,
  onClose,
}: {
  documentId: LegalDocumentId
  onClose: () => void
}) {
  const t = useT()
  const doc = LEGAL_DOCUMENTS[documentId]

  useEscapeKey(onClose)

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
              aria-label={t('common.close')}
              onClick={onClose}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="modal-body legal-body">
            <p className="legal-updated">{t('legal.lastUpdated', { date: doc.updated })}</p>
            <p className="legal-binding">{t('legal.binding')}</p>
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
