import { useEffect, useRef, useState } from 'react'
import { Anchor, Scissors, Trash2, Upload, X } from 'lucide-react'
import { useAppStore } from '../store'
import {
  defaultGpxStrokeWidth,
  resolveGpxStrokeWidth,
  TRACK_COLORS,
} from '../utils/gpx'
import {
  defaultHrScale,
  defaultPaceScale,
  formatPace,
  hasTrackHeartRate,
  hasTrackTiming,
  parsePace,
} from '../utils/gpxMetrics'
import type { LayoutMode } from '../hooks/useLayoutMode'
import Tooltip from './Tooltip'
import GpxCropPanel from './GpxCropPanel'
import DualRangeSlider from './DualRangeSlider'

const PACE_SLIDER_MIN = 2
const PACE_SLIDER_MAX = 20
/** One second of pace (min/km); matches m:ss typing precision */
const PACE_SLIDER_STEP = 1 / 60
const HR_SLIDER_MIN = 60
const HR_SLIDER_MAX = 220
const HR_SLIDER_STEP = 1
const HR_LOW_COLOR = '#2a0404'
const HR_HIGH_COLOR = '#ff9a9a'

function clampToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = Math.min(Math.max(value, min), max)
  const steps = Math.round((clamped - min) / step)
  // Keep enough precision for 1-second pace steps without float drift
  return Number((min + steps * step).toFixed(6))
}

function ScaleValueInput({
  value,
  format,
  parse,
  onCommit,
  ariaLabel,
}: {
  value: number
  format: (n: number) => string
  parse: (s: string) => number | null
  onCommit: (n: number) => void
  ariaLabel: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelRef = useRef(false)
  const display = draft ?? format(value)

  return (
    <input
      type="text"
      className="modal-track-scale-input"
      value={display}
      aria-label={ariaLabel}
      spellCheck={false}
      onFocus={() => {
        cancelRef.current = false
        setDraft(format(value))
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!cancelRef.current && draft != null) {
          const parsed = parse(draft)
          if (parsed != null) onCommit(parsed)
        }
        cancelRef.current = false
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          cancelRef.current = true
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

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

  const [cropTrackId, setCropTrackId] = useState<string | null>(null)
  const isTouch = layoutMode === 'touch'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cropTrackId) setCropTrackId(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cropTrackId, onClose])

  const adjustTrack = () => {
    setActiveTool('gpx')
    onClose()
    if (isTouch) {
      setToastMessage('Tap the track to add pins. Long-press a pin to delete.')
    }
  }

  const handleRemove = (id: string) => {
    if (cropTrackId === id) setCropTrackId(null)
    removeTrack(id)
    if (tracks.length === 1 && activeTool === 'gpx') {
      setActiveTool('select')
    }
  }

  const toggleCrop = (id: string) => {
    setCropTrackId((current) => (current === id ? null : id))
  }

  const strokeTarget = mapImage ?? { width: 1000, height: 1000 }
  const defaultWidth = defaultGpxStrokeWidth(strokeTarget)
  const minWidth = 1
  const maxWidth = Math.round(Math.max(30, defaultWidth * 6))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal modal-gpx${cropTrackId ? ' modal-gpx-crop-open' : ''}`}
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
            const isCropping = cropTrackId === track.id
            const timing = hasTrackTiming(track)
            const hasHr = hasTrackHeartRate(track)
            const paceMode = timing && track.lineStyle === 'pace'
            const hrMode = hasHr && track.lineStyle === 'hr'
            const paceDefaults = timing ? defaultPaceScale(track) : null
            const hrDefaults = hasHr ? defaultHrScale(track) : null
            const paceScale =
              paceMode && paceDefaults
                ? {
                    min: track.paceScaleMin ?? paceDefaults.min,
                    max: track.paceScaleMax ?? paceDefaults.max,
                  }
                : null
            const hrScale =
              hrMode && hrDefaults
                ? {
                    min: track.hrScaleMin ?? hrDefaults.min,
                    max: track.hrScaleMax ?? hrDefaults.max,
                  }
                : null

            const setLineStyle = (style: 'solid' | 'pace' | 'hr') => {
              if (style === 'pace' && paceDefaults) {
                updateTrack(track.id, {
                  lineStyle: 'pace',
                  paceScaleMin: track.paceScaleMin ?? paceDefaults.min,
                  paceScaleMax: track.paceScaleMax ?? paceDefaults.max,
                })
              } else if (style === 'hr' && hrDefaults) {
                updateTrack(track.id, {
                  lineStyle: 'hr',
                  hrScaleMin: track.hrScaleMin ?? hrDefaults.min,
                  hrScaleMax: track.hrScaleMax ?? hrDefaults.max,
                })
              } else {
                updateTrack(track.id, { lineStyle: 'solid' })
              }
            }

            const setPaceMin = (value: number) => {
              updateTrack(
                track.id,
                { paceScaleMin: value },
                `track:${track.id}:paceScale`,
              )
            }

            const setPaceMax = (value: number) => {
              updateTrack(
                track.id,
                { paceScaleMax: value },
                `track:${track.id}:paceScale`,
              )
            }

            const setHrMin = (value: number) => {
              updateTrack(
                track.id,
                { hrScaleMin: value },
                `track:${track.id}:hrScale`,
              )
            }

            const setHrMax = (value: number) => {
              updateTrack(
                track.id,
                { hrScaleMax: value },
                `track:${track.id}:hrScale`,
              )
            }

            const commitPaceMin = (raw: number) => {
              if (!paceScale) return
              setPaceMin(
                clampToStep(
                  raw,
                  PACE_SLIDER_MIN,
                  paceScale.max - PACE_SLIDER_STEP,
                  PACE_SLIDER_STEP,
                ),
              )
            }

            const commitPaceMax = (raw: number) => {
              if (!paceScale) return
              setPaceMax(
                clampToStep(
                  raw,
                  paceScale.min + PACE_SLIDER_STEP,
                  PACE_SLIDER_MAX,
                  PACE_SLIDER_STEP,
                ),
              )
            }

            const commitHrMin = (raw: number) => {
              if (!hrScale) return
              setHrMin(
                clampToStep(
                  raw,
                  HR_SLIDER_MIN,
                  hrScale.max - HR_SLIDER_STEP,
                  HR_SLIDER_STEP,
                ),
              )
            }

            const commitHrMax = (raw: number) => {
              if (!hrScale) return
              setHrMax(
                clampToStep(
                  raw,
                  hrScale.min + HR_SLIDER_STEP,
                  HR_SLIDER_MAX,
                  HR_SLIDER_STEP,
                ),
              )
            }

            const parseHr = (text: string): number | null => {
              const n = Number(text.trim().replace(',', '.'))
              return Number.isFinite(n) ? n : null
            }

            const swatchBackground = hrMode
              ? `linear-gradient(90deg, ${HR_LOW_COLOR}, ${HR_HIGH_COLOR})`
              : paceMode
                ? 'linear-gradient(90deg, #16a34a, #dc2626)'
                : track.color

            return (
              <li key={track.id} className="modal-track">
                <div className="modal-track-top">
                  <span
                    className="modal-track-swatch"
                    style={{ background: swatchBackground }}
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
                          className={`button button-small${isCropping ? ' active' : ''}`}
                          onClick={() => toggleCrop(track.id)}
                        >
                          <Scissors size={14} aria-hidden />
                          Crop
                        </button>
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
                        <Tooltip content="Crop start and end of track">
                          <button
                            type="button"
                            className={`button button-icon-only${isCropping ? ' active' : ''}`}
                            aria-label="Crop track"
                            aria-pressed={isCropping}
                            onClick={() => toggleCrop(track.id)}
                          >
                            <Scissors size={14} aria-hidden />
                          </button>
                        </Tooltip>
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

                {!isCropping && (
                  <div className="modal-track-controls">
                    {(timing || hasHr) && (
                      <div
                        className="gpx-line-style-toggle"
                        role="group"
                        aria-label="Line style"
                      >
                        <button
                          type="button"
                          className={
                            !paceMode && !hrMode ? 'active' : undefined
                          }
                          aria-pressed={!paceMode && !hrMode}
                          onClick={() => setLineStyle('solid')}
                        >
                          Solid
                        </button>
                        {timing && (
                          <button
                            type="button"
                            className={paceMode ? 'active' : undefined}
                            aria-pressed={paceMode}
                            onClick={() => setLineStyle('pace')}
                          >
                            Pace
                          </button>
                        )}
                        {hasHr && (
                          <button
                            type="button"
                            className={hrMode ? 'active' : undefined}
                            aria-pressed={hrMode}
                            onClick={() => setLineStyle('hr')}
                          >
                            HR
                          </button>
                        )}
                      </div>
                    )}
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
                    <div className="modal-track-sliders-row">
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
                      {paceMode && paceScale && (
                        <div className="modal-track-slider modal-track-slider-pace">
                          <i
                            className="modal-track-pace-swatch"
                            style={{ background: '#16a34a' }}
                            title="Fast (green)"
                            aria-hidden
                          />
                          <ScaleValueInput
                            value={paceScale.min}
                            format={formatPace}
                            parse={parsePace}
                            onCommit={commitPaceMin}
                            ariaLabel="Green pace (fast)"
                          />
                          <DualRangeSlider
                            className="modal-track-pace-dual"
                            min={PACE_SLIDER_MIN}
                            max={PACE_SLIDER_MAX}
                            step={PACE_SLIDER_STEP}
                            valueMin={paceScale.min}
                            valueMax={paceScale.max}
                            onChangeMin={setPaceMin}
                            onChangeMax={setPaceMax}
                            ariaLabelMin="Green pace (fast)"
                            ariaLabelMax="Red pace (slow)"
                          />
                          <ScaleValueInput
                            value={paceScale.max}
                            format={formatPace}
                            parse={parsePace}
                            onCommit={commitPaceMax}
                            ariaLabel="Red pace (slow)"
                          />
                          <i
                            className="modal-track-pace-swatch"
                            style={{ background: '#dc2626' }}
                            title="Slow (red)"
                            aria-hidden
                          />
                        </div>
                      )}
                      {hrMode && hrScale && (
                        <div className="modal-track-slider modal-track-slider-pace">
                          <i
                            className="modal-track-pace-swatch"
                            style={{ background: HR_LOW_COLOR }}
                            title="Low HR (dark red)"
                            aria-hidden
                          />
                          <ScaleValueInput
                            value={hrScale.min}
                            format={(n) => String(Math.round(n))}
                            parse={parseHr}
                            onCommit={commitHrMin}
                            ariaLabel="Low heart rate"
                          />
                          <DualRangeSlider
                            className="modal-track-pace-dual dual-range-hr"
                            min={HR_SLIDER_MIN}
                            max={HR_SLIDER_MAX}
                            step={HR_SLIDER_STEP}
                            valueMin={hrScale.min}
                            valueMax={hrScale.max}
                            onChangeMin={setHrMin}
                            onChangeMax={setHrMax}
                            ariaLabelMin="Low heart rate"
                            ariaLabelMax="High heart rate"
                          />
                          <ScaleValueInput
                            value={hrScale.max}
                            format={(n) => String(Math.round(n))}
                            parse={parseHr}
                            onCommit={commitHrMax}
                            ariaLabel="High heart rate"
                          />
                          <i
                            className="modal-track-pace-swatch"
                            style={{ background: HR_HIGH_COLOR }}
                            title="High HR (bright red)"
                            aria-hidden
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isCropping && (
                  <GpxCropPanel
                    track={track}
                    onApply={(cropped) => {
                      updateTrack(track.id, cropped, `track:${track.id}:crop`)
                      setCropTrackId(null)
                    }}
                    onCancel={() => setCropTrackId(null)}
                  />
                )}
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
            className="button button-outline"
            onClick={() => {
              onUploadNew()
              onClose()
            }}
          >
            <Upload size={14} aria-hidden />
            Upload
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onClose}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
