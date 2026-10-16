import { t } from '../i18n'
import {
  Download,
  FilePlus,
  FolderOpen,
  HardDriveDownload,
  Image,
  Library,
  RefreshCw,
  Route,
  Save,
} from 'lucide-react'

export interface TopBarMenuAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  hidden?: boolean
}

export function buildOverflowActions(opts: {
  mapImage: boolean
  hasTracks: boolean
  canSave: boolean
  canInstall: boolean
  updateAvailable: boolean
  onImportImage: () => void
  onImportGpx: () => void
  onEditGpx: () => void
  onNew: () => void
  onProjects: () => void
  onOpen: () => void
  onSave: () => void
  onExport: () => void
  onInstall: () => void
  onUpdate: () => void
}): TopBarMenuAction[] {
  return [
    {
      id: 'update',
      label: t('action.updateApp'),
      icon: <RefreshCw size={16} aria-hidden />,
      onClick: opts.onUpdate,
      primary: true,
      hidden: !opts.updateAvailable,
    },
    {
      id: 'import-image',
      label: opts.mapImage ? t('action.editImage') : t('action.importImage'),
      icon: <Image size={16} aria-hidden />,
      onClick: opts.onImportImage,
    },
    {
      id: 'import-gpx',
      label: opts.hasTracks ? t('action.editGpx') : t('action.importGpx'),
      icon: <Route size={16} aria-hidden />,
      onClick: opts.hasTracks ? opts.onEditGpx : opts.onImportGpx,
    },
    {
      id: 'new',
      label: t('action.newProject'),
      icon: <FilePlus size={16} aria-hidden />,
      onClick: opts.onNew,
    },
    {
      id: 'projects',
      label: t('action.projects'),
      icon: <Library size={16} aria-hidden />,
      onClick: opts.onProjects,
    },
    {
      id: 'open',
      label: t('action.openProject'),
      icon: <FolderOpen size={16} aria-hidden />,
      onClick: opts.onOpen,
    },
    {
      id: 'save',
      label: t('action.saveProject'),
      icon: <Save size={16} aria-hidden />,
      onClick: opts.onSave,
      disabled: !opts.canSave,
    },
    {
      id: 'export',
      label: t('action.export'),
      icon: <Download size={16} aria-hidden />,
      onClick: opts.onExport,
      disabled: !opts.mapImage,
      primary: true,
    },
    {
      id: 'install',
      label: t('action.installApp'),
      icon: <HardDriveDownload size={16} aria-hidden />,
      onClick: opts.onInstall,
      hidden: !opts.canInstall,
    },
  ]
}
