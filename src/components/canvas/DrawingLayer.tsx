import { Layer, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useAppStore } from '../../store'
import type { DrawnPath } from '../../types'

export interface DraftStroke {
  points: number[]
  width: number
  color: string
  opacity: number
}

/** Light smoothing applied to freehand strokes */
const STROKE_TENSION = 0.5

export default function DrawingLayer({ draft }: { draft: DraftStroke | null }) {
  const paths = useAppStore((s) => s.paths)
  const activeTool = useAppStore((s) => s.activeTool)
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updatePath = useAppStore((s) => s.updatePath)

  const selectable = activeTool === 'select'
  const listening = selectable || activeTool === 'eraser'

  // Dragging moves the node; bake the offset back into the stored points
  const bakeDragOffset = (path: DrawnPath, e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const dx = node.x()
    const dy = node.y()
    updatePath(path.id, {
      points: path.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
    })
    node.position({ x: 0, y: 0 })
  }

  return (
    <Layer>
      {paths.map((path) => (
        <Line
          key={path.id}
          id={path.id}
          points={path.points}
          stroke={path.color}
          strokeWidth={path.width}
          opacity={path.opacity}
          hitStrokeWidth={Math.max(path.width * 2, 12)}
          tension={STROKE_TENSION}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          draggable={selectable}
          onClick={() => setSelectedId(path.id)}
          onTap={() => setSelectedId(path.id)}
          onDragStart={() => setSelectedId(path.id)}
          onDragEnd={(e) => bakeDragOffset(path, e)}
          shadowColor="#aa3bff"
          shadowBlur={selectedId === path.id ? Math.max(path.width * 2, 10) : 0}
        />
      ))}

      {draft && draft.points.length >= 4 && (
        <Line
          points={draft.points}
          stroke={draft.color}
          strokeWidth={draft.width}
          tension={STROKE_TENSION}
          lineCap="round"
          lineJoin="round"
          listening={false}
          opacity={draft.opacity * 0.8}
        />
      )}
    </Layer>
  )
}
