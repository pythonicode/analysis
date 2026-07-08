import { useEffect } from 'react'
import { Anchor, Trash2, Upload, X } from 'lucide-react'
import { useAppStore } from '../store'
import {
  defaultGpxStrokeWidth,
  resolveGpxStrokeWidth,
  TRACK_COLORS,
} from '../utils/gpx'
import type { LayoutMode } from '../hooks/useLayoutMode'
import Tooltip from './Tooltip'

export default function EditGpxModal({
  layoutMode,
  onClose,
  onUploadNew,
}: {
  layoutMode: LayoutMode
  onClose: () => void
  onUploadNew: () => void
}) {
  const tracks = useAppStore((s) => s.tracks)
  const mapImage = useAppStore((s) => s.mapImage)
  const updateTrack = useAppStore((s) => s.updateTrack)
  const removeTrack = useAppStore((s) => s.removeTrack)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const setToastMessage = useAppStore((s) => s.setToastMessage)
  const activeTool = useAppStore((s) => s.activeTool)

  const isTouch = layoutMode === 'touch'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const adjustTrack = () => {
    setActiveTool('gpx')
    onClose()
    if (isTouch) {
      setToastMessage('Tap the track to add pins. Long-press a pin to delete.')
    }
  }

  const handleRemove = (id: string) => {
    removeTrack(id)
    if (tracks.length === 1 && activeTool === 'gpx') {
      setActiveTool('select')
    }
  }

  const strokeTarget = mapImage ?? { width: 1000, height: 1000 }
  const defaultWidth = defaultGpxStrokeWidth(strokeTarget)
  const minWidth = 1
  const maxWidth = Math.round(Math.max(30, defaultWidth * 6))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-gpx"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gpx-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="gpx-modal-title">GPX tracks</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <ul className="modal-track-list">
          {tracks.map((track) => {
            const width = Math.round(resolveGpxStrokeWidth(track, mapImage))
            const opacity = Math.round(track.opacity * 100)

            return (
              <li key={track.id} className="modal-track">
                <div className="modal-track-top">
                  <span
                    className="modal-track-swatch"
                    style={{ background: track.color }}
                    aria-hidden
                  />
                  <span className="modal-track-name" title={track.name}>
                    {track.name}
                  </span>
                  <span className="modal-track-meta">
                    {track.anchors.length} pin
                    {track.anchors.length === 1 ? '' : 's'}
                  </span>
                  <div className="modal-track-actions">
                    {isTouch ? (
                      <>
                        <button
                          type="button"
                          className="button button-small"
                          onClick={adjustTrack}
                        >
                          <Anchor size={14} aria-hidden />
                          Adjust on map
                        </button>
                        <button
                          type="button"
                          className="button button-small modal-track-remove"
                          onClick={() => handleRemove(track.id)}
                        >
                          <Trash2 size={14} aria-hidden />
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <Tooltip content="Switch to map and drag anchor pins">
                          <button
                            type="button"
                            className="button button-icon-only"
                            aria-label="Adjust on map"
                            onClick={adjustTrack}
                          >
                            <Anchor size={14} aria-hidden />
                          </button>
                        </Tooltip>
                        <Tooltip content="Remove this track from the project">
                          <button
                            type="button"
                            className="button button-icon-only modal-track-remove"
                            aria-label="Remove track"
                            onClick={() => handleRemove(track.id)}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                <div className="modal-track-controls">
                  <div className="modal-track-colors">
                    {TRACK_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`swatch${track.color === color ? ' active' : ''}`}
                        style={{ background: color }}
                        aria-label={`Track colour ${color}`}
                        onClick={() => updateTrack(track.id, { color })}
                      />
                    ))}
                  </div>
                  <label className="modal-track-slider">
                    <span className="modal-track-slider-label">Width</span>
                    <input
                      type="range"
                      min={minWidth}
                      max={maxWidth}
                      value={width}
                      aria-label="Stroke width"
                      onChange={(e) =>
                        updateTrack(
                          track.id,
                          { width: Number(e.target.value) },
                          `track:${track.id}:width`,
                        )
                      }
                    />
                    <span>{width}</span>
                  </label>
                  <label className="modal-track-slider">
                    <span className="modal-track-slider-label">Opac</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={opacity}
                      aria-label="Opacity"
                      onChange={(e) =>
                        updateTrack(
                          track.id,
                          { opacity: Number(e.target.value) / 100 },
                          `track:${track.id}:opacity`,
                        )
                      }
                    />
                    <span>{opacity}%</span>
                  </label>
                </div>
              </li>
            )
          })}
          {tracks.length === 0 && (
            <li className="modal-empty">No GPX tracks loaded.</li>
          )}
        </ul>

        <div className="modal-footer">
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              onUploadNew()
              onClose()
            }}
          >
            <Upload size={14} aria-hidden />
            Upload GPX
          </button>
        </div>
      </div>
    </div>
  )
}
