import { useRef, useState } from 'react'
import {
  CircleAlert,
  Download,
  HardDriveDownload,
  FilePlus,
  FolderOpen,
  Image,
  Library,
  Redo2,
  RefreshCw,
  Route,
  Save,
  Undo2,
  X,
} from 'lucide-react'
import { useAppStore } from '../store'
import { importGpxFile, importImageFile } from '../utils/files'
import { openProjectFile, saveProjectFile, PROJECT_FILE_EXTENSION } from '../utils/project'
import { createProject, renameCurrentProject } from '../projectLibrary'
import { projectDisplayName } from '../persistence/library'
import ProjectLibraryModal from './ProjectLibraryModal'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { usePwaUpdate } from '../hooks/usePwaUpdate'
import type { LayoutMode } from '../hooks/useLayoutMode'
import EditGpxModal from './EditGpxModal'
import ExportModal from './ExportModal'
import Tooltip from './Tooltip'
import TopBarMenu from './TopBarMenu'
import { buildOverflowActions } from './overflowActions'
import { useT } from '../i18n'

export default function TopBar({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const t = useT()
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
  const projectName = useAppStore((s) => s.projectName)
  const setProjectName = useAppStore((s) => s.setProjectName)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const gpxInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const [gpxModalOpen, setGpxModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const { canInstall, install } = usePwaInstall()
  const { updateAvailable, applyUpdate } = usePwaUpdate()

  const isTouch = layoutMode === 'touch'
  const isCompact = layoutMode === 'compact'
  const showOverflow = isTouch || isCompact

  const handleNewProject = () => void createProject()

  const overflowActions = buildOverflowActions({
    mapImage: mapImage !== null,
    hasTracks,
    canSave,
    canInstall,
    updateAvailable,
    onImportImage: () => imageInputRef.current?.click(),
    onImportGpx: () => gpxInputRef.current?.click(),
    onEditGpx: () => setGpxModalOpen(true),
    onNew: handleNewProject,
    onProjects: () => setLibraryOpen(true),
    onOpen: () => projectInputRef.current?.click(),
    onSave: saveProjectFile,
    onExport: () => setExportModalOpen(true),
    onInstall: () => void install(),
    onUpdate: applyUpdate,
  })

  const errorBanner = importError && (
    <div
      className={`topbar-error${isTouch ? ' topbar-error-banner' : ''}`}
      role="alert"
    >
      <CircleAlert size={14} aria-hidden />
      <span>{importError}</span>
      <button
        type="button"
        className="topbar-error-dismiss"
        aria-label={t('top.dismissError')}
        onClick={() => setImportError(null)}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )

  return (
    <header className="topbar">
      <div className="topbar-title">
        <img
          src="/favicon.svg"
          alt=""
          className="topbar-logo"
          width={20}
          height={20}
        />
        {!isTouch && <h1>O-Analysis</h1>}
        {!isTouch && (
          <input
            className="topbar-project-name"
            type="text"
            value={projectDisplayName(projectName)}
            maxLength={80}
            aria-label={t('top.projectName')}
            title={t('top.projectName')}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={(e) => renameCurrentProject(e.target.value)}
          />
        )}
      </div>

      {importError && !isTouch && errorBanner}

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
            if (file) void openProjectFile(file, 'file_picker')
            e.target.value = ''
          }}
        />

        <div className="topbar-history" role="group" aria-label={t('top.history')}>
          <Tooltip content={t('top.undoHint')}>
            <button
              type="button"
              className="button button-icon-only"
              disabled={!canUndo}
              aria-label={t('top.undo')}
              onClick={undo}
            >
              <Undo2 size={16} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content={t('top.redoHint')}>
            <button
              type="button"
              className="button button-icon-only"
              disabled={!canRedo}
              aria-label={t('top.redo')}
              onClick={redo}
            >
              <Redo2 size={16} aria-hidden />
            </button>
          </Tooltip>
        </div>

        {!showOverflow && (
          <>
            <Tooltip
              content={
                mapImage
                  ? t('top.replaceImageHint')
                  : t('top.importImageHint')
              }
            >
              <button
                type="button"
                className="button"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image size={16} aria-hidden />
                <span className="button-label">
                  {mapImage ? t('action.editImage') : t('action.importImage')}
                </span>
              </button>
            </Tooltip>
            <Tooltip
              content={
                hasTracks
                  ? t('top.editGpxHint')
                  : t('top.importGpxHint')
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
                <span className="button-label">
                  {hasTracks ? t('action.editGpx') : t('action.importGpx')}
                </span>
              </button>
            </Tooltip>
            <Tooltip content={t('top.newHint')}>
              <button type="button" className="button" onClick={handleNewProject}>
                <FilePlus size={16} aria-hidden />
                <span className="button-label">{t('top.new')}</span>
              </button>
            </Tooltip>
            <Tooltip content={t('top.projectsHint')}>
              <button
                type="button"
                className="button"
                onClick={() => setLibraryOpen(true)}
              >
                <Library size={16} aria-hidden />
                <span className="button-label">{t('top.projects')}</span>
              </button>
            </Tooltip>
            <Tooltip content={t('top.openHint', { ext: PROJECT_FILE_EXTENSION })}>
              <button
                type="button"
                className="button"
                onClick={() => projectInputRef.current?.click()}
              >
                <FolderOpen size={16} aria-hidden />
                <span className="button-label">{t('top.open')}</span>
              </button>
            </Tooltip>
            <Tooltip
              content={
                canSave
                  ? t('top.saveHint', { ext: PROJECT_FILE_EXTENSION })
                  : t('top.saveDisabled')
              }
            >
              <button
                type="button"
                className="button"
                disabled={!canSave}
                onClick={saveProjectFile}
              >
                <Save size={16} aria-hidden />
                <span className="button-label">{t('top.save')}</span>
              </button>
            </Tooltip>
            <Tooltip
              content={
                mapImage
                  ? t('top.exportHint')
                  : t('top.exportDisabled')
              }
            >
              <button
                type="button"
                className="button button-primary"
                disabled={!mapImage}
                onClick={() => setExportModalOpen(true)}
              >
                <Download size={16} aria-hidden />
                <span className="button-label">{t('action.export')}</span>
              </button>
            </Tooltip>
            {updateAvailable && (
              <Tooltip content={t('top.updateHint')}>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={applyUpdate}
                >
                  <RefreshCw size={16} aria-hidden />
                  <span className="button-label">{t('top.updateApp')}</span>
                </button>
              </Tooltip>
            )}
            {canInstall && (
              <Tooltip content={t('top.installHint')}>
                <button
                  type="button"
                  className="button"
                  onClick={() => void install()}
                >
                  <HardDriveDownload size={16} aria-hidden />
                  <span className="button-label">{t('top.installApp')}</span>
                </button>
              </Tooltip>
            )}
          </>
        )}

        {showOverflow && <TopBarMenu layoutMode={layoutMode} actions={overflowActions} />}
      </div>

      {isTouch && errorBanner}

      {gpxModalOpen && (
        <EditGpxModal
          layoutMode={layoutMode}
          onClose={() => setGpxModalOpen(false)}
          onUploadNew={() => gpxInputRef.current?.click()}
        />
      )}

      {exportModalOpen && (
        <ExportModal
          layoutMode={layoutMode}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {libraryOpen && (
        <ProjectLibraryModal
          layoutMode={layoutMode}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </header>
  )
}
