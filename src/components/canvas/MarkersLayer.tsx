import { Circle, Group, Layer, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useAppStore } from '../../store'
import { markerLabel } from '../../utils/labels'

export default function MarkersLayer() {
  const annotations = useAppStore((s) => s.annotations)
  const activeTool = useAppStore((s) => s.activeTool)
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updateAnnotation = useAppStore((s) => s.updateAnnotation)

  const selectable = activeTool === 'select'

  const commitDrag = (id: string, e: KonvaEventObject<DragEvent>) => {
    updateAnnotation(id, {
      position: { x: e.target.x(), y: e.target.y() },
    })
  }

  return (
    <Layer>
      {annotations.map((annotation, index) => {
        const selected = selectedId === annotation.id
        const radius = annotation.size
        const label = markerLabel(index)
        // Shrink the font for multi-letter labels so they stay inside the circle
        const fontSize =
          radius * (label.length === 1 ? 1.2 : label.length === 2 ? 0.85 : 0.6)
        return (
          <Group
            key={annotation.id}
            id={annotation.id}
            x={annotation.position.x}
            y={annotation.position.y}
            draggable={selectable}
            onClick={() => selectable && setSelectedId(annotation.id)}
            onTap={() => selectable && setSelectedId(annotation.id)}
            onDragStart={() => setSelectedId(annotation.id)}
            onDragEnd={(e) => commitDrag(annotation.id, e)}
          >
            <Circle
              radius={radius}
              fill={annotation.color}
              stroke={selected ? '#08060d' : '#ffffff'}
              strokeWidth={radius * (selected ? 0.25 : 0.15)}
              hitStrokeWidth={Math.max(radius, 10)}
              shadowColor="#000000"
              shadowBlur={radius * 0.4}
              shadowOpacity={0.3}
            />
            <Text
              text={label}
              fill="#ffffff"
              fontStyle="bold"
              fontSize={fontSize}
              width={radius * 2}
              height={radius * 2}
              offsetX={radius}
              offsetY={radius}
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )
      })}
    </Layer>
  )
}
