import { useMemo, useState } from 'react'
import { Circle, Group, Layer, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useAppStore } from '../../store'
import { nearestVertex, warpPoints } from '../../utils/warp'
import { resolveGpxStrokeWidth } from '../../utils/gpx'
import type { GpxTrack } from '../../types'

function Track({
  track,
  adjustMode,
  strokeWidth,
  pinRadius,
}: {
  track: GpxTrack
  adjustMode: boolean
  strokeWidth: number
  pinRadius: number
}) {
  const updateTrack = useAppStore((s) => s.updateTrack)
  // Local override so the line warps live while a pin is dragged,
  // committed to the store (one undo step) only on drag end
  const [dragAnchors, setDragAnchors] = useState<typeof track.anchors | null>(
    null,
  )
  const anchors = dragAnchors ?? track.anchors

  const warped = useMemo(
    () => warpPoints(track.points, anchors),
    [track.points, anchors],
  )

  const addAnchorAtPointer = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!adjustMode) return
    if ('button' in e.evt && e.evt.button !== 0) return
    const stage = e.target.getStage()
    const pos = stage?.getRelativePointerPosition()
    if (!pos) return
    const vertex = nearestVertex(warped, pos)
    const source = {
      x: track.points[vertex.index * 2],
      y: track.points[vertex.index * 2 + 1],
    }
    // One anchor per source vertex
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
    const next = track.anchors.map((a, i) =>
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
            onDragMove={(e) => movePin(index, e)}
            onDragEnd={(e) => commitPin(index, e)}
            onContextMenu={(e) => handlePinContextMenu(index, e)}
            onDblClick={() => removePin(index)}
            onDblTap={() => removePin(index)}
          >
            <Circle
              radius={pinRadius}
              fill="#ffffff"
              stroke={track.color}
              strokeWidth={pinRadius * 0.45}
              shadowColor="#000000"
              shadowBlur={pinRadius * 0.6}
              shadowOpacity={0.35}
            />
            <Circle radius={pinRadius * 0.3} fill={track.color} listening={false} />
          </Group>
        ))}
    </Group>
  )
}

export default function GpxLayer() {
  const tracks = useAppStore((s) => s.tracks)
  const mapImage = useAppStore((s) => s.mapImage)
  const activeTool = useAppStore((s) => s.activeTool)
  const viewportScale = useAppStore((s) => s.viewport.scale)

  const adjustMode = activeTool === 'gpx'
  // Pins keep a constant on-screen size regardless of zoom
  const pinRadius = 9 / viewportScale

  return (
    <Layer>
      {tracks.map((track) => (
        <Track
          key={track.id}
          track={track}
          adjustMode={adjustMode}
          strokeWidth={resolveGpxStrokeWidth(track, mapImage)}
          pinRadius={pinRadius}
        />
      ))}
    </Layer>
  )
}
