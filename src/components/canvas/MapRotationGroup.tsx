import { Group } from 'react-konva'
import type Konva from 'konva'
import { contentGroupRef } from '../../contentGroupRef'
import { useAppStore } from '../../store'

export default function MapRotationGroup({
  children,
  attachRef = false,
}: {
  children: React.ReactNode
  attachRef?: boolean
}) {
  const rotation = useAppStore((s) => s.viewport.rotation)
  const mapImage = useAppStore((s) => s.mapImage)
  const centerX = (mapImage?.width ?? 0) / 2
  const centerY = (mapImage?.height ?? 0) / 2

  const setRef = (node: Konva.Group | null) => {
    if (attachRef) contentGroupRef.current = node
  }

  return (
    <Group
      ref={setRef}
      rotation={rotation}
      offsetX={centerX}
      offsetY={centerY}
      x={centerX}
      y={centerY}
    >
      {children}
    </Group>
  )
}
