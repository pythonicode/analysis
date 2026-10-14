import { useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { saveProjectFile, PROJECT_FILE_EXTENSION } from '../utils/project'
import type { LayoutMode } from '../hooks/useLayoutMode'
import Tooltip from './Tooltip'

/** Confirms before the current project is replaced by a new or opened one. */
export default function ReplaceProjectModal({
  layoutMode,
  title,
  description,
  confirmLabel,
  canSave,
  onConfirm,
  onClose,
  onExport,
}: {
  layoutMode: LayoutMode
  title: string
  description: string
  confirmLabel: string
  canSave: boolean
  onConfirm: () => void
  onClose: () => void
  /** Omit to hide the Export shortcut */
  onExport?: () => void
}) {
  const isTouch = layoutMode === 'touch'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const confirm = () => {
    onConfirm()
    onClose()
  }

  const saveButton = (
    <button
      type="button"
      className="button"
      disabled={!canSave}
      onClick={saveProjectFile}
    >
      <Save size={14} aria-hidden />
      Save
    </button>
  )

  const exportButton = onExport && (
    <button type="button" className="button" onClick={onExport}>
      Export
    </button>
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-project-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="replace-project-modal-title">{title}</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <p className="modal-body">{description}</p>

        <div
          className={`modal-actions${isTouch ? ' modal-actions-touch' : ' modal-actions-split'}`}
        >
          <div className="modal-actions-group">
            {isTouch ? (
              <>
                {saveButton}
                {exportButton}
              </>
            ) : (
              <>
                <Tooltip
                  content={
                    canSave
                      ? `Save project as ${PROJECT_FILE_EXTENSION}`
                      : 'Nothing to save — import a map or add content first'
                  }
                >
                  {saveButton}
                </Tooltip>
                {exportButton && (
                  <Tooltip content="Download annotated map">
                    {exportButton}
                  </Tooltip>
                )}
              </>
            )}
          </div>
          <div className="modal-actions-group">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={confirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
