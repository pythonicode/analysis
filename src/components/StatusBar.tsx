import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { getToolLabel } from '../config/tools'
import type { LegalDocumentId } from '../content/legal'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { useAppStore } from '../store'
import {
  ANNOTATION_TEXT_SCALE_MAX,
  ANNOTATION_TEXT_SCALE_MIN,
  ANNOTATION_TEXT_SCALE_STEP,
} from '../utils/annotationTextScale'
import { stageRef } from '../stageRef'
import CanvasRotationControl from './CanvasRotationControl'
import LegalModal from './LegalModal'

const MIN_SCALE = 0.05
const MAX_SCALE = 8
const ZOOM_FACTOR = 1.15

export default function StatusBar({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const activeTool = useAppStore((s) => s.activeTool)
  const scale = useAppStore((s) => s.viewport.scale)
  const setViewport = useAppStore((s) => s.setViewport)
  const pointer = useAppStore((s) => s.pointer)
  const textScalePct = useAppStore((s) => s.annotationTextScalePct)
  const setAnnotationTextScalePct = useAppStore(
    (s) => s.setAnnotationTextScalePct,
  )
  const [legalDoc, setLegalDoc] = useState<LegalDocumentId | null>(null)

  const showCoords = layoutMode === 'desktop'
  const showZoomButtons = layoutMode === 'touch'
  const showRotation = layoutMode !== 'touch'
  const showLegalLinks = layoutMode !== 'touch'
  const showCredit = layoutMode === 'desktop'

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
      <span className="statusbar-zoom">
        Zoom: {Math.round(scale * 100)}%
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
      <label className="statusbar-font">
        <span>Font</span>
        <input
          className="statusbar-font-slider"
          type="range"
          min={ANNOTATION_TEXT_SCALE_MIN}
          max={ANNOTATION_TEXT_SCALE_MAX}
          step={ANNOTATION_TEXT_SCALE_STEP}
          value={textScalePct}
          aria-label="Font size"
          aria-valuemin={ANNOTATION_TEXT_SCALE_MIN}
          aria-valuemax={ANNOTATION_TEXT_SCALE_MAX}
          aria-valuenow={textScalePct}
          aria-valuetext={`${textScalePct}%`}
          onChange={(e) => setAnnotationTextScalePct(Number(e.target.value))}
        />
        <span className="statusbar-font-value">{textScalePct}%</span>
      </label>
      {showCoords && (
        <span>
          {pointer
            ? `X: ${Math.round(pointer.x)} Y: ${Math.round(pointer.y)}`
            : 'X: — Y: —'}
        </span>
      )}
      <span className="statusbar-tool">Tool: {getToolLabel(activeTool)}</span>
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
