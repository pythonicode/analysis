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
import LanguageSelect from './LanguageSelect'
import { getLocale, useT } from '../i18n'
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
  const t = useT()
  if (state.status === 'idle') return null
  const label =
    state.status === 'error'
      ? t('save.failed')
      : state.status === 'saved' && state.savedAt
        ? t('save.saved', { time: new Date(state.savedAt).toLocaleTimeString(getLocale(), {
            hour: '2-digit',
            minute: '2-digit',
          }) })
        : t('save.saving')
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
  const t = useT()
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
        title={t('status.fitHint')}
        aria-label={t('status.fitAria', { zoom: Math.round(scale * 100) })}
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
            aria-label={t('status.zoomOut')}
            onClick={() => zoomBy(-1)}
          >
            <Minus size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="statusbar-zoom-btn"
            aria-label={t('status.zoomIn')}
            onClick={() => zoomBy(1)}
          >
            <Plus size={14} aria-hidden />
          </button>
        </span>
      )}
      {showTextSize && <TextSizeSlider label={layoutMode === 'compact' ? t('status.textSizeShort') : t('status.textSize')} />}
      {showCoords && (
        <span>
          {pointer
            ? t('status.coords', { x: Math.round(pointer.x), y: Math.round(pointer.y) })
            : t('status.noCoords')}
        </span>
      )}
      {showToolName && (
        <span className="statusbar-tool">{t('status.tool', { tool: getToolLabel(activeTool) })}</span>
      )}
      <SaveIndicator state={saveState} />
      {showLegalLinks && <LanguageSelect />}
      {showLegalLinks && (
        <nav className="statusbar-legal" aria-label={t('status.legal')}>
          <button
            type="button"
            className="statusbar-legal-link"
            onClick={() => setLegalDoc('privacy')}
          >
            {t('status.privacy')}
          </button>
          <span className="statusbar-legal-sep" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className="statusbar-legal-link"
            onClick={() => setLegalDoc('terms')}
          >
            {t('status.terms')}
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
                {t('status.credit')}
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
