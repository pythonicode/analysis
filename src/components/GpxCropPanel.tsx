import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GpxTrack } from '../types'
import {
  computePaceSeries,
  cropTrack,
  distanceAtVertex,
  formatPace,
  vertexCount,
} from '../utils/gpxMetrics'

const CHART_HEIGHT = 160
const PAD = { top: 14, right: 14, bottom: 30, left: 46 }

interface GpxCropPanelProps {
  track: GpxTrack
  onApply: (cropped: GpxTrack) => void
  onCancel: () => void
}

function formatDistanceKm(km: number): string {
  if (km < 10) return `${km.toFixed(2)} km`
  return `${km.toFixed(1)} km`
}

export default function GpxCropPanel({
  track,
  onApply,
  onCancel,
}: GpxCropPanelProps) {
  const n = vertexCount(track)
  const [startIndex, setStartIndex] = useState(0)
  const [endIndex, setEndIndex] = useState(n - 1)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { samples, hasTiming } = useMemo(
    () => computePaceSeries(track),
    [track],
  )

  const totalDistanceKm = samples[n - 1]?.distanceKm ?? 0

  const chartWidth = 400
  const plotW = chartWidth - PAD.left - PAD.right
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom

  const paceValues = useMemo(
    () =>
      samples
        .map((s) => s.paceMinPerKm)
        .filter((p): p is number => p != null),
    [samples],
  )

  const paceMin = paceValues.length > 0 ? Math.min(...paceValues) : 4
  const paceMax = paceValues.length > 0 ? Math.max(...paceValues) : 10
  const yMin = Math.max(2, paceMin - 0.5)
  const yMax = paceMax + 0.5

  const xScale = useCallback(
    (distanceKm: number) =>
      PAD.left + (totalDistanceKm > 0 ? (distanceKm / totalDistanceKm) * plotW : 0),
    [plotW, totalDistanceKm],
  )

  const yScale = useCallback(
    (pace: number) =>
      PAD.top + ((pace - yMin) / (yMax - yMin || 1)) * plotH,
    [plotH, yMin, yMax],
  )

  const indexFromClientX = useCallback(
    (clientX: number): number => {
      const svg = svgRef.current
      if (!svg || totalDistanceKm <= 0) return 0
      const rect = svg.getBoundingClientRect()
      const relX = ((clientX - rect.left) / rect.width) * chartWidth
      const distKm =
        ((relX - PAD.left) / plotW) * totalDistanceKm
      const clamped = Math.max(0, Math.min(totalDistanceKm, distKm))
      let best = 0
      let bestDiff = Infinity
      for (let i = 0; i < n; i++) {
        const d = Math.abs(samples[i]!.distanceKm - clamped)
        if (d < bestDiff) {
          bestDiff = d
          best = i
        }
      }
      return best
    },
    [chartWidth, n, plotW, samples, totalDistanceKm],
  )

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: PointerEvent) => {
      const idx = indexFromClientX(e.clientX)
      if (dragging === 'start') {
        setStartIndex(Math.min(idx, endIndex - 1))
      } else {
        setEndIndex(Math.max(idx, startIndex + 1))
      }
    }

    const onUp = () => setDragging(null)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, endIndex, indexFromClientX, startIndex])

  const pacePath = useMemo(() => {
    if (!hasTiming) return ''
    const parts: string[] = []
    let started = false
    for (let i = 1; i < n; i++) {
      const pace = samples[i]!.paceMinPerKm
      if (pace == null) continue
      const x = xScale(samples[i]!.distanceKm)
      const y = yScale(pace)
      parts.push(`${started ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`)
      started = true
    }
    return parts.join(' ')
  }, [hasTiming, n, samples, xScale, yScale])

  const selStartX = xScale(samples[startIndex]!.distanceKm)
  const selEndX = xScale(samples[endIndex]!.distanceKm)
  const keptKm =
    samples[endIndex]!.distanceKm - samples[startIndex]!.distanceKm
  const isValid = endIndex - startIndex >= 1
  const isUnchanged = startIndex === 0 && endIndex === n - 1

  const handleChartMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) return
    setHoverIndex(indexFromClientX(e.clientX))
  }

  const hoverSample =
    hoverIndex != null ? samples[hoverIndex] : null

  const yTicks = hasTiming
    ? [yMin, (yMin + yMax) / 2, yMax]
    : []

  const xTicks = totalDistanceKm > 0
    ? [0, totalDistanceKm / 2, totalDistanceKm]
    : [0]

  return (
    <div className="gpx-crop-panel">
      <p className="gpx-crop-panel-title">Crop track</p>
      {!hasTiming && (
        <p className="gpx-crop-panel-note">
          No timing data in this GPX — crop by distance
        </p>
      )}

      <div className="gpx-pace-chart">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          className="gpx-pace-chart-svg"
          onPointerMove={handleChartMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {/* Plot background */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            className="gpx-pace-chart-plot"
          />

          {/* Y-axis ticks (pace) */}
          {hasTiming &&
            yTicks.map((pace) => (
              <g key={pace}>
                <line
                  x1={PAD.left}
                  y1={yScale(pace)}
                  x2={PAD.left + plotW}
                  y2={yScale(pace)}
                  className="gpx-pace-chart-grid"
                />
                <text
                  x={PAD.left - 6}
                  y={yScale(pace)}
                  className="gpx-pace-chart-axis-label"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {formatPace(pace).replace('/km', '')}
                </text>
              </g>
            ))}

          {/* X-axis ticks (distance) */}
          {xTicks.map((km) => (
            <text
              key={km}
              x={xScale(km)}
              y={CHART_HEIGHT - 8}
              className="gpx-pace-chart-axis-label"
              textAnchor="middle"
            >
              {km.toFixed(1)}
            </text>
          ))}

          {/* Distance-only baseline */}
          {!hasTiming && (
            <line
              x1={PAD.left}
              y1={PAD.top + plotH / 2}
              x2={PAD.left + plotW}
              y2={PAD.top + plotH / 2}
              className="gpx-pace-chart-baseline"
            />
          )}

          {/* Dimmed regions outside selection */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={Math.max(0, selStartX - PAD.left)}
            height={plotH}
            className="gpx-crop-dim"
          />
          <rect
            x={selEndX}
            y={PAD.top}
            width={Math.max(0, PAD.left + plotW - selEndX)}
            height={plotH}
            className="gpx-crop-dim"
          />

          {/* Selected region highlight */}
          <rect
            x={selStartX}
            y={PAD.top}
            width={Math.max(0, selEndX - selStartX)}
            height={plotH}
            className="gpx-crop-selection"
          />

          {/* Pace line */}
          {pacePath && (
            <path d={pacePath} className="gpx-pace-chart-line" fill="none" />
          )}

          {/* Hover crosshair */}
          {hoverSample && !dragging && (
            <line
              x1={xScale(hoverSample.distanceKm)}
              y1={PAD.top}
              x2={xScale(hoverSample.distanceKm)}
              y2={PAD.top + plotH}
              className="gpx-pace-chart-crosshair"
            />
          )}

          {/* Crop handles */}
          {(['start', 'end'] as const).map((which) => {
            const idx = which === 'start' ? startIndex : endIndex
            const x = xScale(samples[idx]!.distanceKm)
            return (
              <g key={which}>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={PAD.top + plotH}
                  className="gpx-crop-handle-line"
                />
                <rect
                  x={x - 12}
                  y={PAD.top - 4}
                  width={24}
                  height={plotH + 8}
                  className="gpx-crop-handle-hit"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragging(which)
                  }}
                />
                <rect
                  x={x - 3}
                  y={PAD.top + plotH / 2 - 14}
                  width={6}
                  height={28}
                  rx={3}
                  className="gpx-crop-handle"
                />
              </g>
            )
          })}
        </svg>

        {hoverSample && (
          <div className="gpx-pace-chart-tooltip" aria-live="polite">
            {formatDistanceKm(hoverSample.distanceKm)}
            {hoverSample.paceMinPerKm != null && (
              <> · {formatPace(hoverSample.paceMinPerKm)}</>
            )}
          </div>
        )}
      </div>

      <div className="gpx-crop-stats">
        <span>
          {formatDistanceKm(distanceAtVertex(track, startIndex))} →{' '}
          {formatDistanceKm(distanceAtVertex(track, endIndex))}
        </span>
        <span className="gpx-crop-stats-kept">
          {formatDistanceKm(keptKm)} kept
        </span>
      </div>

      {!isValid && (
        <p className="gpx-crop-error">Selection must include at least 2 points.</p>
      )}

      <div className="gpx-crop-actions">
        <button type="button" className="button button-small" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="button button-small button-primary"
          disabled={!isValid || isUnchanged}
          onClick={() => onApply(cropTrack(track, startIndex, endIndex))}
        >
          Apply crop
        </button>
      </div>
    </div>
  )
}
