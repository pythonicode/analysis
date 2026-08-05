import { useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Shape } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Context } from 'konva/lib/Context'
import { useAppStore } from '../../store'
import { nearestVertex, warpPoints } from '../../utils/warp'
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
import type { GpxTrack } from '../../types'
import type { LayoutMode } from '../../hooks/useLayoutMode'
import MapRotationGroup from './MapRotationGroup'
import { getMapPointer } from '../../utils/mapPointer'

const LONG_PRESS_MS = 500

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
  const [dragAnchors, setDragAnchors] = useState<typeof track.anchors | null>(
    null,
  )
  const longPressTimerRef = useRef<number | null>(null)
  const longPressIndexRef = useRef<number | null>(null)

  const anchors = dragAnchors ?? track.anchors

  const warped = useMemo(
    () => warpPoints(track.points, anchors),
    [track.points, anchors],
  )

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
    const next = anchors.map((a, i) =>
      i === index ? { ...a, target: { x: e.target.x(), y: e.target.y() } } : a,
    )
    setDragAnchors(next)
  }

  const commitPin = (index: number, e: KonvaEventObject<DragEvent>) => {
    const next = anchors.map((a, i) =>
      i === index ? { ...a, target: { x: e.target.x(), y: e.target.y() } } : a,
    )
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

  const drawHeatMapStroke = (context: Context) => {
    const ctx = context._context
    ctx.save()
    ctx.globalAlpha = track.opacity
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = strokeWidth
    const n = warped.length / 2
    for (let i = 1; i < n; i++) {
      const x0 = warped[(i - 1) * 2]!
      const y0 = warped[(i - 1) * 2 + 1]!
      const x1 = warped[i * 2]!
      const y1 = warped[i * 2 + 1]!
      if (paceMode && paceScale) {
        const pace = paceSamples[i]?.paceMinPerKm ?? null
        ctx.strokeStyle = paceToColor(pace, paceScale.min, paceScale.max)
      } else if (hrMode && hrScale) {
        const hr = hrSamples[i]?.hrBpm ?? null
        ctx.strokeStyle = hrToColor(hr, hrScale.min, hrScale.max)
      } else {
        continue
      }
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }
    ctx.restore()
  }

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
            opacity={track.opacity}
            listening={adjustMode}
            onClick={addAnchorAtPointer}
            onTap={addAnchorAtPointer}
          />
          <Shape
            sceneFunc={drawHeatMapStroke}
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

export default function GpxLayer({
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
