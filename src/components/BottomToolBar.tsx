import { useState } from 'react'
import { MessageSquareText, Settings } from 'lucide-react'
import { TOOLS, getToolTip } from '../config/tools'
import { useAppStore } from '../store'
import BottomSheet from './BottomSheet'
import StrokeSettings from './StrokeSettings'

export default function BottomToolBar() {
  const activeTool = useAppStore((s) => s.activeTool)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const hasTracks = useAppStore((s) => s.tracks.length > 0)
  const annotations = useAppStore((s) => s.annotations)
  const annotationsOpen = useAppStore((s) => s.annotationsOpen)
  const toggleAnnotations = useAppStore((s) => s.toggleAnnotations)

  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <nav className="bottom-toolbar" aria-label="Drawing tools">
        <div className="bottom-toolbar-tools" role="toolbar">
          {TOOLS.map(({ id, label, shortLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`bottom-tool-button${activeTool === id ? ' active' : ''}`}
              aria-label={label}
              aria-pressed={activeTool === id}
              title={getToolTip(id, 'touch')}
              disabled={id === 'gpx' && !hasTracks}
              onClick={() => setActiveTool(id)}
            >
              <Icon size={20} aria-hidden />
              <span className="bottom-tool-label">{shortLabel}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="bottom-tool-button bottom-tool-extra"
          aria-label="Stroke settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={20} aria-hidden />
          <span className="bottom-tool-label">Style</span>
        </button>

        <button
          type="button"
          className={`bottom-tool-button bottom-tool-extra${annotationsOpen ? ' active' : ''}`}
          aria-label="Annotations"
          aria-pressed={annotationsOpen}
          onClick={toggleAnnotations}
        >
          <MessageSquareText size={20} aria-hidden />
          <span className="bottom-tool-label">Notes</span>
          {annotations.length > 0 && (
            <span className="bottom-tool-badge">{annotations.length}</span>
          )}
        </button>
      </nav>

      {settingsOpen && (
        <BottomSheet title="Stroke settings" onClose={() => setSettingsOpen(false)}>
          <StrokeSettings layoutMode="touch" />
        </BottomSheet>
      )}
    </>
  )
}
