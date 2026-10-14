import {
  Download,
  FilePlus,
  FolderOpen,
  HardDriveDownload,
  Image,
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
  onOpen: () => void
  onSave: () => void
  onExport: () => void
  onInstall: () => void
  onUpdate: () => void
}): TopBarMenuAction[] {
  return [
    {
      id: 'update',
      label: 'Update App',
      icon: <RefreshCw size={16} aria-hidden />,
      onClick: opts.onUpdate,
      primary: true,
      hidden: !opts.updateAvailable,
    },
    {
      id: 'import-image',
      label: opts.mapImage ? 'Edit Image' : 'Import Image',
      icon: <Image size={16} aria-hidden />,
      onClick: opts.onImportImage,
    },
    {
      id: 'import-gpx',
      label: opts.hasTracks ? 'Edit GPX' : 'Import GPX',
      icon: <Route size={16} aria-hidden />,
      onClick: opts.hasTracks ? opts.onEditGpx : opts.onImportGpx,
    },
    {
      id: 'new',
      label: 'New Project',
      icon: <FilePlus size={16} aria-hidden />,
      onClick: opts.onNew,
    },
    {
      id: 'open',
      label: 'Open Project',
      icon: <FolderOpen size={16} aria-hidden />,
      onClick: opts.onOpen,
    },
    {
      id: 'save',
      label: 'Save Project',
      icon: <Save size={16} aria-hidden />,
      onClick: opts.onSave,
      disabled: !opts.canSave,
    },
    {
      id: 'export',
      label: 'Export',
      icon: <Download size={16} aria-hidden />,
      onClick: opts.onExport,
      disabled: !opts.mapImage,
      primary: true,
    },
    {
      id: 'install',
      label: 'Install App',
      icon: <HardDriveDownload size={16} aria-hidden />,
      onClick: opts.onInstall,
      hidden: !opts.canInstall,
    },
  ]
}
