import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useAppStore } from '../store'
import {
  defaultIncludeSidebar,
  downloadExport,
  renderExportPreviews,
  type ExportPreviewImages,
} from '../utils/export'
import type { LayoutMode } from '../hooks/useLayoutMode'

const SCALE_MIN = 50
const SCALE_MAX = 200
const SCALE_STEP = 5

const PREVIEW_ZOOM_MIN = 1
const PREVIEW_ZOOM_MAX = 4
const PREVIEW_ZOOM_STEP = 0.25

function scaleToMultiplier(percent: number): number {
  return percent / 100
}

export default function ExportModal({
  layoutMode,
  onClose,
}: {
  layoutMode: LayoutMode
  onClose: () => void
}) {
  const annotations = useAppStore((s) => s.annotations)
  const markerDisplayMode = useAppStore((s) => s.markerDisplayMode)

  const [includeSidebar, setIncludeSidebar] = useState(() =>
    defaultIncludeSidebar(markerDisplayMode, annotations.length),
  )
  const [textScalePct, setTextScalePct] = useState(100)
  const [previews, setPreviews] = useState<ExportPreviewImages | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const panStartRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    panX: number
    panY: number
  } | null>(null)

  const textScale = scaleToMultiplier(textScalePct)

  const refreshPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const next = await renderExportPreviews({ includeSidebar, textScale })
      setPreviews(next)
    } finally {
      setPreviewLoading(false)
    }
  }, [includeSidebar, textScale])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview()
    }, 150)
    return () => window.clearTimeout(timer)
  }, [refreshPreview])

  useEffect(() => {
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
  }, [previews?.full.url])

  useEffect(() => {
    const el = previewWrapRef.current
    if (!el) return
    const measure = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  /** Full-resolution bitmap when zoomed past fit; thumbnail otherwise. */
  const useFullRes = previewZoom > 1
  const activePreview = previews
    ? useFullRes
      ? previews.full
      : previews.thumb
    : null

  const previewReady =
    activePreview !== null && containerSize.w > 0 && containerSize.h > 0

  const fitScale = previewReady
    ? Math.min(
        containerSize.w / activePreview.width,
        containerSize.h / activePreview.height,
        1,
      )
    : 1

  const previewZoomMax =
    fitScale > 0 ? Math.max(PREVIEW_ZOOM_MAX, 1 / fitScale) : PREVIEW_ZOOM_MAX

  const displayScale = fitScale * previewZoom

  const setZoom = useCallback(
    (updater: number | ((current: number) => number)) => {
      setPreviewZoom((current) => {
        const next =
          typeof updater === 'function' ? updater(current) : updater
        const clamped = Math.min(
          previewZoomMax,
          Math.max(PREVIEW_ZOOM_MIN, next),
        )
        if (clamped <= 1) setPreviewPan({ x: 0, y: 0 })
        return clamped
      })
    },
    [previewZoomMax],
  )

  const handlePreviewWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      setPreviewZoom((current) => {
        const next = Math.min(
          previewZoomMax,
          Math.max(PREVIEW_ZOOM_MIN, current * factor),
        )
        if (next <= 1) setPreviewPan({ x: 0, y: 0 })
        return next
      })
    },
    [previewZoomMax],
  )

  useEffect(() => {
    const el = previewWrapRef.current
    if (!el || !previews) return
    el.addEventListener('wheel', handlePreviewWheel, { passive: false })
    return () => el.removeEventListener('wheel', handlePreviewWheel)
  }, [handlePreviewWheel, previews])

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewZoom <= 1 || e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    panStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      panX: previewPan.x,
      panY: previewPan.y,
    }
    setIsPanning(true)
  }

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current
    if (!start || start.pointerId !== e.pointerId) return
    e.stopPropagation()
    setPreviewPan({
      x: start.panX + (e.clientX - start.startX),
      y: start.panY + (e.clientY - start.startY),
    })
  }

  const endPreviewPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current
    if (!start || start.pointerId !== e.pointerId) return
    e.stopPropagation()
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    panStartRef.current = null
    setIsPanning(false)
  }

  const resetPreviewView = () => {
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
  }

  const stopPreviewPointer = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadExport({ includeSidebar, textScale })
      onClose()
    } finally {
      setExporting(false)
    }
  }

  const hasAnnotations = annotations.length > 0
  const isTouch = layoutMode === 'touch'

  const zoomLabel =
    previewZoom <= 1.01
      ? 'Fit'
      : useFullRes
        ? `${Math.round(Math.min(100, displayScale * 100))}%`
        : `${Math.round(previewZoom * 100)}%`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-export"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="export-modal-title">Export</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="modal-body export-modal-body">
          <div
            ref={previewWrapRef}
            className={`export-preview-wrap${isPanning ? ' is-panning' : ''}${previewZoom > 1 ? ' is-zoomed' : ''}`}
          >
            {previewLoading && !previews && (
              <p className="export-preview-placeholder">Generating preview…</p>
            )}
            {previews && (
              <>
                {!previewReady && (
                  <p className="export-preview-placeholder">Loading preview…</p>
                )}
                <div
                  className="export-preview-stage"
                  style={
                    previewReady
                      ? {
                          visibility: 'visible',
                          transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${displayScale})`,
                        }
                      : { visibility: 'hidden' }
                  }
                  onPointerDown={handlePreviewPointerDown}
                  onPointerMove={handlePreviewPointerMove}
                  onPointerUp={endPreviewPan}
                  onPointerCancel={endPreviewPan}
                >
                  <img
                    src={previews.thumb.url}
                    alt=""
                    aria-hidden
                    width={previews.thumb.width}
                    height={previews.thumb.height}
                    className={`export-preview-image export-preview-image-thumb${useFullRes ? ' export-preview-image-hidden' : ''}${previewLoading ? ' export-preview-image-loading' : ''}`}
                    draggable={false}
                  />
                  <img
                    src={previews.full.url}
                    alt="Export preview"
                    width={previews.full.width}
                    height={previews.full.height}
                    className={`export-preview-image export-preview-image-full${useFullRes ? '' : ' export-preview-image-hidden'}${previewLoading ? ' export-preview-image-loading' : ''}`}
                    draggable={false}
                  />
                </div>
                <div
                  className="export-preview-zoom-bar"
                  onPointerDown={stopPreviewPointer}
                  onClick={stopPreviewPointer}
                >
                  <span className="export-preview-zoom-label">{zoomLabel}</span>
                  <button
                    type="button"
                    className="button export-preview-zoom-btn"
                    aria-label="Zoom out"
                    disabled={previewZoom <= PREVIEW_ZOOM_MIN + 0.01}
                    onClick={() =>
                      setZoom((current) => current - PREVIEW_ZOOM_STEP)
                    }
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="button export-preview-zoom-btn"
                    aria-label="Zoom in"
                    disabled={previewZoom >= previewZoomMax - 0.01}
                    onClick={() =>
                      setZoom((current) => current + PREVIEW_ZOOM_STEP)
                    }
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="button export-preview-zoom-btn"
                    aria-label="Reset zoom"
                    disabled={
                      previewZoom <= 1.01 &&
                      Math.abs(previewPan.x) < 1 &&
                      Math.abs(previewPan.y) < 1
                    }
                    onClick={resetPreviewView}
                  >
                    <RotateCcw size={14} aria-hidden />
                  </button>
                </div>
                <p className="export-preview-hint">
                  Scroll to zoom · drag to pan
                </p>
              </>
            )}
          </div>

          {hasAnnotations && (
            <div className="export-controls">
              <label className="export-toggle">
                <input
                  type="checkbox"
                  checked={includeSidebar}
                  onChange={(e) => setIncludeSidebar(e.target.checked)}
                />
                <span>Include annotation sidebar</span>
              </label>
              <p className="export-control-hint">
                {markerDisplayMode === 'comments'
                  ? 'Comments are shown on the map — turn off the sidebar to avoid duplicating them.'
                  : 'The sidebar lists each marker letter with its comment.'}
              </p>

              <label className="export-slider">
                <span className="export-slider-label">Text size</span>
                <input
                  type="range"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={SCALE_STEP}
                  value={textScalePct}
                  aria-label="Text size"
                  onChange={(e) => setTextScalePct(Number(e.target.value))}
                />
                <span className="export-slider-value">{textScalePct}%</span>
              </label>
            </div>
          )}
        </div>

        <div className={`modal-actions${isTouch ? ' modal-actions-touch' : ''}`}>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={exporting || previewLoading}
            onClick={() => void handleExport()}
          >
            <Download size={14} aria-hidden />
            {exporting ? 'Exporting…' : 'Download PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
