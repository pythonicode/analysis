import { useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { getToolLabel } from '../config/tools'
import type { LegalDocumentId } from '../content/legal'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { useAppStore } from '../store'
import type { SaveStatus } from '../saveStatus'
import { stageRef } from '../stageRef'
import { useSaveState } from '../saveStatus'
import TextSizeSlider from './TextSizeSlider'
import CanvasRotationControl from './CanvasRotationControl'
import LegalModal from './LegalModal'

const MIN_SCALE = 0.05
const MAX_SCALE = 8
const ZOOM_FACTOR = 1.15

function SaveIndicator({
  state,
}: {
  state: { status: SaveStatus; savedAt: number | null }
}) {
  if (state.status === 'idle') return null
  const label =
    state.status === 'error'
      ? 'Autosave failed'
      : state.status === 'saved' && state.savedAt
        ? `Saved ${new Date(state.savedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'Saving…'
  return (
    <span
      className={`statusbar-save${state.status === 'error' ? ' statusbar-save-error' : ''}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </span>
  )
}

export default function StatusBar({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const activeTool = useAppStore((s) => s.activeTool)
  const scale = useAppStore((s) => s.viewport.scale)
  const setViewport = useAppStore((s) => s.setViewport)
  const pointer = useAppStore((s) => s.pointer)
  const hasMap = useAppStore((s) => s.mapImage !== null)
  const requestFitToView = useAppStore((s) => s.requestFitToView)
  const saveState = useSaveState()
  const [legalDoc, setLegalDoc] = useState<LegalDocumentId | null>(null)

  const showCoords = layoutMode === 'desktop'
  const showZoomButtons = layoutMode === 'touch'
  const showRotation = layoutMode !== 'touch'
  const showLegalLinks = layoutMode !== 'touch'
  const showCredit = layoutMode === 'desktop'
  // Narrower layouts keep the bar to the essentials; the Style sheet holds the rest on touch
  const showToolName = layoutMode === 'desktop'
  const showTextSize = layoutMode !== 'touch'

  const zoomBy = (direction: 1 | -1) => {
    const viewport = useAppStore.getState().viewport
    const stage = stageRef.current
    const oldScale = stage ? stage.scaleX() : viewport.scale
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR,
      ),
    )
    setViewport({
      ...viewport,
      scale: newScale,
      x: stage ? stage.x() : viewport.x,
      y: stage ? stage.y() : viewport.y,
    })
  }

  return (
    <footer className="statusbar">
      <button
        type="button"
        className="statusbar-zoom"
        disabled={!hasMap}
        onClick={requestFitToView}
        title="Fit the map to the screen"
        aria-label={`Zoom ${Math.round(scale * 100)}%. Fit map to screen`}
      >
        <Maximize2 size={12} aria-hidden />
        <span>{Math.round(scale * 100)}%</span>
      </button>
      {showRotation && <CanvasRotationControl compact={layoutMode === 'compact'} />}
      {showZoomButtons && (
        <span className="statusbar-zoom-controls">
          <button
            type="button"
            className="statusbar-zoom-btn"
            aria-label="Zoom out"
            onClick={() => zoomBy(-1)}
          >
            <Minus size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="statusbar-zoom-btn"
            aria-label="Zoom in"
            onClick={() => zoomBy(1)}
          >
            <Plus size={14} aria-hidden />
          </button>
        </span>
      )}
      {showTextSize && <TextSizeSlider label={layoutMode === 'compact' ? 'Text' : 'Text Size'} />}
      {showCoords && (
        <span>
          {pointer
            ? `X: ${Math.round(pointer.x)} Y: ${Math.round(pointer.y)}`
            : 'X: — Y: —'}
        </span>
      )}
      {showToolName && (
        <span className="statusbar-tool">Tool: {getToolLabel(activeTool)}</span>
      )}
      <SaveIndicator state={saveState} />
      {showLegalLinks && (
        <nav className="statusbar-legal" aria-label="Legal">
          <button
            type="button"
            className="statusbar-legal-link"
            onClick={() => setLegalDoc('privacy')}
          >
            Privacy
          </button>
          <span className="statusbar-legal-sep" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className="statusbar-legal-link"
            onClick={() => setLegalDoc('terms')}
          >
            Terms
          </button>
           {showCredit && (
            <>
            <span className="statusbar-legal-sep" aria-hidden>
                ·
              </span>
              <a
                className="statusbar-legal-link statusbar-credit"
                href="https://anthonyriley.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                by Anthony Riley ❤️
              </a>
            </>
          )}
        </nav>
      )}
      {legalDoc && (
        <LegalModal documentId={legalDoc} onClose={() => setLegalDoc(null)} />
      )}
    </footer>
  )
}
