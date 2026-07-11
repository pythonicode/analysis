import { useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useAppStore } from '../../store'
import { nearestVertex, warpPoints } from '../../utils/warp'
import { resolveGpxStrokeWidth } from '../../utils/gpx'
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
}: {
  track: GpxTrack
  adjustMode: boolean
  strokeWidth: number
  pinRadius: number
  isTouch: boolean
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

  return (
    <Group>
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
          />
        ))}
      </MapRotationGroup>
    </Layer>
  )
}
