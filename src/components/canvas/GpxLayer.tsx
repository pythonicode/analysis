import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Shape } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Context } from 'konva/lib/Context'
import { useAppStore } from '../../store'
import { nearestVertex, warpPoints } from '../../utils/warp'
import { simplifyPathKeepingIndices } from '../../utils/geometry'
import { resolveGpxStrokeWidth } from '../../utils/gpx'
import {
  computeHrSeries,
  computePaceSeries,
  defaultHrScale,
  defaultPaceScale,
  hasTrackHeartRate,
  hasTrackTiming,
  hrToColor,
  paceToColor,
} from '../../utils/gpxMetrics'
import type { GpxAnchor, GpxTrack } from '../../types'
import type { LayoutMode } from '../../hooks/useLayoutMode'
import MapRotationGroup from './MapRotationGroup'
import { getMapPointer } from '../../utils/mapPointer'

const LONG_PRESS_MS = 500
/** Map-unit tolerance for the live thin-plate preview while a pin is dragged. */
const DRAG_PREVIEW_EPSILON = 2

interface HeatRun {
  color: string
  /** Inclusive vertex index in the polyline being drawn. */
  start: number
  end: number
}

/** Consecutive vertices that share a quantized color, as one stroke each. */
function buildHeatRuns(
  vertexCount: number,
  colorAt: (vertexIndex: number) => string,
): HeatRun[] {
  if (vertexCount < 2) return []
  const runs: HeatRun[] = []
  let start = 0
  let color = colorAt(1)
  for (let i = 2; i < vertexCount; i++) {
    const next = colorAt(i)
    if (next !== color) {
      runs.push({ color, start, end: i - 1 })
      color = next
      start = i - 1
    }
  }
  runs.push({ color, start, end: vertexCount - 1 })
  return runs
}

/** Viewport-sized buffer so heat-map segments flatten before opacity is applied. */
let heatMapScratch: HTMLCanvasElement | null = null

function getHeatMapScratch(
  width: number,
  height: number,
): HTMLCanvasElement | null {
  if (width < 1 || height < 1) return null
  if (!heatMapScratch) {
    heatMapScratch = document.createElement('canvas')
  }
  if (heatMapScratch.width !== width || heatMapScratch.height !== height) {
    heatMapScratch.width = width
    heatMapScratch.height = height
  }
  return heatMapScratch
}

function Track({
  track,
  adjustMode,
  strokeWidth,
  pinRadius,
  isTouch,
  viewportScale,
}: {
  track: GpxTrack
  adjustMode: boolean
  strokeWidth: number
  pinRadius: number
  isTouch: boolean
  viewportScale: number
}) {
  const updateTrack = useAppStore((s) => s.updateTrack)
  const [dragAnchors, setDragAnchors] = useState<GpxAnchor[] | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressIndexRef = useRef<number | null>(null)
  const dragRafRef = useRef<number | null>(null)
  const pendingAnchorsRef = useRef<GpxAnchor[] | null>(null)

  const anchors = dragAnchors ?? track.anchors
  const anchorsRef = useRef(anchors)
  anchorsRef.current = anchors

  const previewingSpline = dragAnchors !== null && anchors.length >= 3
  const decimated = useMemo(() => {
    if (!previewingSpline) return null
    return simplifyPathKeepingIndices(track.points, DRAG_PREVIEW_EPSILON)
  }, [previewingSpline, track.points])

  const sourcePoints = decimated?.points ?? track.points
  const warped = useMemo(
    () => warpPoints(sourcePoints, anchors),
    [sourcePoints, anchors],
  )

  useEffect(() => {
    return () => {
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current)
      }
    }
  }, [])

  const paceMode =
    track.lineStyle === 'pace' && hasTrackTiming(track)
  const hrMode =
    track.lineStyle === 'hr' && hasTrackHeartRate(track)
  const heatMapMode = paceMode || hrMode

  const { samples: paceSamples } = useMemo(
    () => (paceMode ? computePaceSeries(track) : { samples: [] }),
    [paceMode, track],
  )

  const { samples: hrSamples } = useMemo(
    () => (hrMode ? computeHrSeries(track) : { samples: [] }),
    [hrMode, track],
  )

  const paceScale = useMemo(() => {
    if (!paceMode) return null
    if (
      track.paceScaleMin != null &&
      track.paceScaleMax != null &&
      track.paceScaleMin < track.paceScaleMax
    ) {
      return { min: track.paceScaleMin, max: track.paceScaleMax }
    }
    return defaultPaceScale(track)
  }, [paceMode, track])

  const hrScale = useMemo(() => {
    if (!hrMode) return null
    if (
      track.hrScaleMin != null &&
      track.hrScaleMax != null &&
      track.hrScaleMin < track.hrScaleMax
    ) {
      return { min: track.hrScaleMin, max: track.hrScaleMax }
    }
    return defaultHrScale(track)
  }, [hrMode, track])

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressIndexRef.current = null
  }

  const addAnchorAtPointer = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!adjustMode) return
    if ('button' in e.evt && e.evt.button !== 0) return
    const stage = e.target.getStage()
    const pos = stage ? getMapPointer(stage) : null
    if (!pos) return
    const vertex = nearestVertex(warped, pos)
    const source = {
      x: track.points[vertex.index * 2],
      y: track.points[vertex.index * 2 + 1],
    }
    const duplicate = track.anchors.some(
      (a) => a.source.x === source.x && a.source.y === source.y,
    )
    if (duplicate) return
    updateTrack(track.id, {
      anchors: [
        ...track.anchors,
        { source, target: { x: vertex.x, y: vertex.y } },
      ],
    })
  }

  const movePin = (index: number, e: KonvaEventObject<DragEvent>) => {
    const base = pendingAnchorsRef.current ?? anchorsRef.current
    const next = base.map((a, i) =>
      i === index ? { ...a, target: { x: e.target.x(), y: e.target.y() } } : a,
    )
    pendingAnchorsRef.current = next
    if (dragRafRef.current != null) return
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null
      const pending = pendingAnchorsRef.current
      if (pending) setDragAnchors(pending)
    })
  }

  const commitPin = (index: number, e: KonvaEventObject<DragEvent>) => {
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    const base = pendingAnchorsRef.current ?? anchorsRef.current
    const next = base.map((a, i) =>
      i === index ? { ...a, target: { x: e.target.x(), y: e.target.y() } } : a,
    )
    pendingAnchorsRef.current = null
    setDragAnchors(null)
    updateTrack(track.id, { anchors: next })
  }

  const removePin = (index: number) => {
    setDragAnchors(null)
    updateTrack(track.id, {
      anchors: track.anchors.filter((_, i) => i !== index),
    })
  }

  const handlePinContextMenu = (
    index: number,
    e: KonvaEventObject<PointerEvent>,
  ) => {
    e.evt.preventDefault()
    if (!adjustMode) return
    removePin(index)
  }

  const startLongPress = (index: number) => {
    if (!isTouch || !adjustMode) return
    clearLongPress()
    longPressIndexRef.current = index
    longPressTimerRef.current = window.setTimeout(() => {
      removePin(index)
      longPressTimerRef.current = null
    }, LONG_PRESS_MS)
  }

  const hitRadius = isTouch ? Math.max(pinRadius, 20) : pinRadius
  const borderWidth = 2 / Math.max(viewportScale, 0.001)
  const outlineWidth = strokeWidth + borderWidth

  const heatRuns = useMemo(() => {
    if (!heatMapMode) return []
    const vertexCount = warped.length / 2
    const indices = decimated?.indices
    return buildHeatRuns(vertexCount, (index) => {
      const sourceIndex = indices?.[index] ?? index
      if (paceMode && paceScale) {
        return paceToColor(
          paceSamples[sourceIndex]?.paceMinPerKm ?? null,
          paceScale.min,
          paceScale.max,
        )
      }
      if (hrMode && hrScale) {
        return hrToColor(
          hrSamples[sourceIndex]?.hrBpm ?? null,
          hrScale.min,
          hrScale.max,
        )
      }
      return '#9ca3af'
    })
  }, [
    heatMapMode,
    warped,
    decimated,
    paceMode,
    paceScale,
    paceSamples,
    hrMode,
    hrScale,
    hrSamples,
  ])

  const heatSignature = useMemo(
    () => heatRuns.map((run) => `${run.color}:${run.end}`).join('|'),
    [heatRuns],
  )

  const paintRef = useRef({
    warped,
    heatRuns,
    outlineWidth,
    strokeWidth,
    opacity: track.opacity,
  })
  paintRef.current = {
    warped,
    heatRuns,
    outlineWidth,
    strokeWidth,
    opacity: track.opacity,
  }

  const drawHeatMapStroke = useCallback((context: Context) => {
    const ctx = context._context
    const scratch = getHeatMapScratch(ctx.canvas.width, ctx.canvas.height)
    const octx = scratch?.getContext('2d')
    if (!scratch || !octx) return

    const paint = paintRef.current
    const points = paint.warped
    const n = points.length / 2
    if (n < 2) return

    octx.setTransform(1, 0, 0, 1, 0, 0)
    octx.clearRect(0, 0, scratch.width, scratch.height)
    octx.setTransform(ctx.getTransform())
    octx.globalAlpha = 1
    octx.lineCap = 'round'
    octx.lineJoin = 'round'

    octx.lineWidth = paint.outlineWidth
    octx.strokeStyle = '#000000'
    octx.beginPath()
    octx.moveTo(points[0]!, points[1]!)
    for (let i = 1; i < n; i++) {
      octx.lineTo(points[i * 2]!, points[i * 2 + 1]!)
    }
    octx.stroke()

    octx.lineWidth = paint.strokeWidth
    for (const run of paint.heatRuns) {
      octx.strokeStyle = run.color
      octx.beginPath()
      octx.moveTo(points[run.start * 2]!, points[run.start * 2 + 1]!)
      for (let i = run.start + 1; i <= run.end; i++) {
        octx.lineTo(points[i * 2]!, points[i * 2 + 1]!)
      }
      octx.stroke()
    }

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = paint.opacity
    ctx.drawImage(scratch, 0, 0)
    ctx.restore()
  }, [])

  return (
    <Group>
      {heatMapMode ? (
        <>
          <Line
            points={warped}
            stroke="#000000"
            strokeWidth={outlineWidth}
            hitStrokeWidth={strokeWidth * 5}
            lineCap="round"
            lineJoin="round"
            opacity={0}
            listening={adjustMode}
            onClick={addAnchorAtPointer}
            onTap={addAnchorAtPointer}
          />
          <Shape
            sceneFunc={drawHeatMapStroke}
            strokeWidth={outlineWidth}
            fill={heatSignature}
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      ) : (
        <Line
          points={warped}
          stroke={track.color}
          strokeWidth={strokeWidth}
          hitStrokeWidth={strokeWidth * 5}
          lineCap="round"
          lineJoin="round"
          opacity={track.opacity}
          listening={adjustMode}
          onClick={addAnchorAtPointer}
          onTap={addAnchorAtPointer}
        />
      )}
      {adjustMode &&
        anchors.map((anchor, index) => (
          <Group
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            x={anchor.target.x}
            y={anchor.target.y}
            draggable
            onDragStart={() => {
              clearLongPress()
              if (pendingAnchorsRef.current == null) {
                pendingAnchorsRef.current = anchorsRef.current
                setDragAnchors(anchorsRef.current)
              }
            }}
            onDragMove={(e) => movePin(index, e)}
            onDragEnd={(e) => commitPin(index, e)}
            onContextMenu={(e) => handlePinContextMenu(index, e)}
            onDblClick={() => removePin(index)}
            onDblTap={() => removePin(index)}
            onPointerDown={() => startLongPress(index)}
            onPointerUp={clearLongPress}
            onPointerLeave={clearLongPress}
          >
            <Circle
              radius={hitRadius}
              fill="#ffffff"
              stroke={track.color}
              strokeWidth={hitRadius * 0.45}
              shadowColor="#000000"
              shadowBlur={hitRadius * 0.6}
              shadowOpacity={0.35}
            />
            <Circle
              radius={hitRadius * 0.3}
              fill={track.color}
              listening={false}
            />
          </Group>
        ))}
    </Group>
  )
}

function GpxLayer({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const tracks = useAppStore((s) => s.tracks)
  const mapImage = useAppStore((s) => s.mapImage)
  const activeTool = useAppStore((s) => s.activeTool)
  const viewportScale = useAppStore((s) => s.viewport.scale)

  const adjustMode = activeTool === 'gpx'
  const isTouch = layoutMode === 'touch'
  const pinRadius = (isTouch ? 11 : 9) / viewportScale

  return (
    <Layer>
      <MapRotationGroup>
        {tracks.map((track) => (
          <Track
            key={track.id}
            track={track}
            adjustMode={adjustMode}
            strokeWidth={resolveGpxStrokeWidth(track, mapImage)}
            pinRadius={pinRadius}
            isTouch={isTouch}
            viewportScale={viewportScale}
          />
        ))}
      </MapRotationGroup>
    </Layer>
  )
}

export default memo(GpxLayer)
