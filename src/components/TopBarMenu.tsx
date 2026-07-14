import { useEffect, useRef, useState } from 'react'
import {
  Download,
  FilePlus,
  FolderOpen,
  HardDriveDownload,
  Image,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Route,
  Save,
} from 'lucide-react'
import type { LayoutMode } from '../hooks/useLayoutMode'
import BottomSheet from './BottomSheet'

export interface TopBarMenuAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  hidden?: boolean
}

export default function TopBarMenu({
  layoutMode,
  actions,
}: {
  layoutMode: LayoutMode
  actions: TopBarMenuAction[]
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const visibleActions = actions.filter((a) => !a.hidden)

  useEffect(() => {
    if (!open || layoutMode !== 'compact') return
    const onPointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open, layoutMode])

  const runAction = (action: TopBarMenuAction) => {
    if (action.disabled) return
    action.onClick()
    setOpen(false)
  }

  const menuItems = (
    <ul className="topbar-menu-list">
      {visibleActions.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            className={`topbar-menu-item${action.primary ? ' topbar-menu-item-primary' : ''}`}
            disabled={action.disabled}
            onClick={() => runAction(action)}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  if (layoutMode === 'touch') {
    return (
      <>
        <button
          type="button"
          className="button button-icon-only"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={18} aria-hidden />
        </button>
        {open && (
          <BottomSheet title="Menu" onClose={() => setOpen(false)}>
            <div className="topbar-menu-sections">
              <div className="topbar-menu-section">
                <h3>File</h3>
                {menuItems}
              </div>
            </div>
          </BottomSheet>
        )}
      </>
    )
  }

  return (
    <div className="topbar-menu" ref={dropdownRef}>
      <button
        type="button"
        className="button button-icon-only"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && <div className="topbar-menu-dropdown">{menuItems}</div>}
    </div>
  )
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
