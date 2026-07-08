import { useRef, useState } from 'react'
import {
  CircleAlert,
  Download,
  FilePlus,
  FolderOpen,
  Image,
  Map,
  Redo2,
  Route,
  Save,
  Undo2,
  X,
} from 'lucide-react'
import { useAppStore } from '../store'
import { importGpxFile, importImageFile } from '../utils/files'
import { exportPng } from '../utils/export'
import { openProjectFile, saveProjectFile, PROJECT_FILE_EXTENSION } from '../utils/project'
import EditGpxModal from './EditGpxModal'
import NewProjectModal from './NewProjectModal'
import Tooltip from './Tooltip'

export default function TopBar() {
  const mapImage = useAppStore((s) => s.mapImage)
  const hasTracks = useAppStore((s) => s.tracks.length > 0)
  const hasPaths = useAppStore((s) => s.paths.length > 0)
  const hasAnnotations = useAppStore((s) => s.annotations.length > 0)
  const canSave =
    mapImage !== null || hasTracks || hasPaths || hasAnnotations
  const importError = useAppStore((s) => s.importError)
  const setImportError = useAppStore((s) => s.setImportError)
  const canUndo = useAppStore((s) => s.past.length > 0)
  const canRedo = useAppStore((s) => s.future.length > 0)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const newProject = useAppStore((s) => s.newProject)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const gpxInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const [gpxModalOpen, setGpxModalOpen] = useState(false)
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false)

  const handleNewProject = () => {
    if (!canSave) {
      newProject()
      return
    }
    setNewProjectModalOpen(true)
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <Map size={20} aria-hidden />
        <h1>Map Analysis</h1>
      </div>

      {importError && (
        <div className="topbar-error" role="alert">
          <CircleAlert size={14} aria-hidden />
          <span>{importError}</span>
          <button
            type="button"
            className="topbar-error-dismiss"
            aria-label="Dismiss error"
            onClick={() => setImportError(null)}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}

      <div className="topbar-actions">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importImageFile(file)
            e.target.value = ''
          }}
        />
        <input
          ref={gpxInputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importGpxFile(file)
            e.target.value = ''
          }}
        />
        <input
          ref={projectInputRef}
          type="file"
          accept={PROJECT_FILE_EXTENSION}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void openProjectFile(file)
            e.target.value = ''
          }}
        />

        <div className="topbar-history" role="group" aria-label="History">
          <Tooltip content="Undo last action (⌘Z / Ctrl+Z)">
            <button
              type="button"
              className="button button-icon-only"
              disabled={!canUndo}
              aria-label="Undo"
              onClick={undo}
            >
              <Undo2 size={16} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Redo (⌘⇧Z / Ctrl+Shift+Z)">
            <button
              type="button"
              className="button button-icon-only"
              disabled={!canRedo}
              aria-label="Redo"
              onClick={redo}
            >
              <Redo2 size={16} aria-hidden />
            </button>
          </Tooltip>
        </div>

        <Tooltip
          content={
            mapImage
              ? 'Replace the current map image'
              : 'Upload a map image — PNG, JPG, or drop a file on the canvas'
          }
        >
          <button
            type="button"
            className="button"
            onClick={() => imageInputRef.current?.click()}
          >
            <Image size={16} aria-hidden />
            {mapImage ? 'Edit Image' : 'Import Image'}
          </button>
        </Tooltip>
        <Tooltip
          content={
            hasTracks
              ? 'Change track colours, width, or alignment'
              : 'Import a GPX file to overlay a route on the map'
          }
        >
          <button
            type="button"
            className="button"
            onClick={() => {
              if (hasTracks) setGpxModalOpen(true)
              else gpxInputRef.current?.click()
            }}
          >
            <Route size={16} aria-hidden />
            {hasTracks ? 'Edit GPX' : 'Import GPX'}
          </button>
        </Tooltip>
        <Tooltip content="Clear the canvas and start fresh">
          <button type="button" className="button" onClick={handleNewProject}>
            <FilePlus size={16} aria-hidden />
            New
          </button>
        </Tooltip>
        <Tooltip content={`Open a saved project (${PROJECT_FILE_EXTENSION})`}>
          <button
            type="button"
            className="button"
            onClick={() => projectInputRef.current?.click()}
          >
            <FolderOpen size={16} aria-hidden />
            Open
          </button>
        </Tooltip>
        <Tooltip
          content={
            canSave
              ? `Save your project as ${PROJECT_FILE_EXTENSION}`
              : 'Nothing to save yet — import a map or add annotations first'
          }
        >
          <button
            type="button"
            className="button"
            disabled={!canSave}
            onClick={saveProjectFile}
          >
            <Save size={16} aria-hidden />
            Save
          </button>
        </Tooltip>
        <Tooltip
          content={
            mapImage
              ? 'Download the map with all drawings and annotations'
              : 'Import a map image before exporting'
          }
        >
          <button
            type="button"
            className="button button-primary"
            disabled={!mapImage}
            onClick={exportPng}
          >
            <Download size={16} aria-hidden />
            Export PNG
          </button>
        </Tooltip>
      </div>

      {gpxModalOpen && (
        <EditGpxModal
          onClose={() => setGpxModalOpen(false)}
          onUploadNew={() => gpxInputRef.current?.click()}
        />
      )}

      {newProjectModalOpen && (
        <NewProjectModal
          canSave={canSave}
          canExport={mapImage !== null}
          onConfirm={newProject}
          onClose={() => setNewProjectModalOpen(false)}
        />
      )}
    </header>
  )
}
