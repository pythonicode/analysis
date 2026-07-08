import { useEffect } from 'react'
import { Download, Save, X } from 'lucide-react'
import { exportPng } from '../utils/export'
import { saveProjectFile, PROJECT_FILE_EXTENSION } from '../utils/project'
import type { LayoutMode } from '../hooks/useLayoutMode'
import Tooltip from './Tooltip'

export default function NewProjectModal({
  layoutMode,
  canSave,
  canExport,
  onConfirm,
  onClose,
}: {
  layoutMode: LayoutMode
  canSave: boolean
  canExport: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const isTouch = layoutMode === 'touch'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const startNew = () => {
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

  const exportButton = (
    <button
      type="button"
      className="button"
      disabled={!canExport}
      onClick={exportPng}
    >
      <Download size={14} aria-hidden />
      Export PNG
    </button>
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="new-project-modal-title">Start a new project?</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <p className="modal-body">
          Your current work will be cleared when you start a new project. Save or
          export it first if you want to keep a copy.
        </p>

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
                <Tooltip
                  content={
                    canExport
                      ? 'Download annotated map'
                      : 'Import a map image first'
                  }
                >
                  {exportButton}
                </Tooltip>
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
              onClick={startNew}
            >
              Start new
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
