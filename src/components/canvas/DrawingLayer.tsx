import { Layer, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useAppStore } from '../../store'
import type { DrawnPath } from '../../types'
import type { LayoutMode } from '../../hooks/useLayoutMode'
import { canUseShadow } from '../../utils/viewport'
import MapRotationGroup from './MapRotationGroup'

export interface DraftStroke {
  points: number[]
  width: number
  color: string
  opacity: number
}

const STROKE_TENSION = 0.5
const TOUCH_DRAG_THRESHOLD = 8

export default function DrawingLayer({
  draft,
  layoutMode,
}: {
  draft: DraftStroke | null
  layoutMode: LayoutMode
}) {
  const paths = useAppStore((s) => s.paths)
  const activeTool = useAppStore((s) => s.activeTool)
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updatePath = useAppStore((s) => s.updatePath)

  const selectable = activeTool === 'select'
  const listening = selectable || activeTool === 'eraser'
  const isTouch = layoutMode === 'touch'
  const hitMultiplier = isTouch ? 1.5 : 1
  const viewportScale = useAppStore((s) => s.viewport.scale)

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
      <MapRotationGroup>
        {paths.map((path) => {
        const selectionShadow =
          selectedId === path.id &&
          canUseShadow(path.width * 2, viewportScale)
        const shadowBlur = selectionShadow
          ? Math.max(path.width * 2 * hitMultiplier, 10)
          : 0

        return (
        <Line
          key={path.id}
          id={path.id}
          points={path.points}
          stroke={path.color}
          strokeWidth={path.width}
          opacity={path.opacity}
          hitStrokeWidth={Math.max(path.width * 2 * hitMultiplier, 12)}
          tension={STROKE_TENSION}
          lineCap="round"
          lineJoin="round"
          listening={listening}
          draggable={selectable}
          dragDistance={isTouch ? TOUCH_DRAG_THRESHOLD : 0}
          onClick={() => setSelectedId(path.id)}
          onTap={() => setSelectedId(path.id)}
          onDragStart={() => setSelectedId(path.id)}
          onDragEnd={(e) => bakeDragOffset(path, e)}
          shadowColor={selectionShadow ? '#aa3bff' : undefined}
          shadowBlur={shadowBlur}
        />
        )
      })}

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
      </MapRotationGroup>
    </Layer>
  )
}
