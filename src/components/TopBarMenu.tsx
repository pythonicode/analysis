import { useEffect, useRef, useState } from 'react'
import { FileText, Menu, MoreHorizontal, Shield } from 'lucide-react'
import type { LegalDocumentId } from '../content/legal'
import type { LayoutMode } from '../hooks/useLayoutMode'
import BottomSheet from './BottomSheet'
import LegalModal from './LegalModal'
import type { TopBarMenuAction } from './overflowActions'

export default function TopBarMenu({
  layoutMode,
  actions,
}: {
  layoutMode: LayoutMode
  actions: TopBarMenuAction[]
}) {
  const [open, setOpen] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDocumentId | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const visibleActions = actions.filter((a) => !a.hidden)

  const openLegal = (id: LegalDocumentId) => {
    setOpen(false)
    setLegalDoc(id)
  }

  const legalMenuItems = (
    <ul className="topbar-menu-list">
      <li>
        <button
          type="button"
          className="topbar-menu-item"
          onClick={() => openLegal('privacy')}
        >
          <Shield size={16} aria-hidden />
          <span>Privacy Policy</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className="topbar-menu-item"
          onClick={() => openLegal('terms')}
        >
          <FileText size={16} aria-hidden />
          <span>Terms of Service</span>
        </button>
      </li>
    </ul>
  )

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
              <div className="topbar-menu-section">
                <h3>Legal</h3>
                {legalMenuItems}
              </div>
            </div>
          </BottomSheet>
        )}
        {legalDoc && (
          <LegalModal documentId={legalDoc} onClose={() => setLegalDoc(null)} />
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
