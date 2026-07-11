import { Minus, Plus } from 'lucide-react'
import { getToolLabel } from '../config/tools'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { useAppStore } from '../store'
import CanvasRotationControl from './CanvasRotationControl'

const MIN_SCALE = 0.05
const MAX_SCALE = 8
const ZOOM_FACTOR = 1.15

export default function StatusBar({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const activeTool = useAppStore((s) => s.activeTool)
  const viewport = useAppStore((s) => s.viewport)
  const setViewport = useAppStore((s) => s.setViewport)
  const pointer = useAppStore((s) => s.pointer)

  const showCoords = layoutMode === 'desktop'
  const showZoomButtons = layoutMode === 'touch'
  const showRotation = layoutMode !== 'touch'

  const zoomBy = (direction: 1 | -1) => {
    const oldScale = viewport.scale
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR,
      ),
    )
    setViewport({ ...viewport, scale: newScale })
  }

  return (
    <footer className="statusbar">
      <span className="statusbar-zoom">
        Zoom: {Math.round(viewport.scale * 100)}%
      </span>
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
      {showCoords && (
        <span>
          {pointer
            ? `X: ${Math.round(pointer.x)} Y: ${Math.round(pointer.y)}`
            : 'X: — Y: —'}
        </span>
      )}
      <span className="statusbar-tool">Tool: {getToolLabel(activeTool)}</span>
    </footer>
  )
}
