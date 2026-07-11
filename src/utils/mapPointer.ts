import type Konva from 'konva'
import { contentGroupRef } from '../contentGroupRef'
import type { Point } from '../types'

/** Pointer position in map coordinates, accounting for viewport rotation. */
export function getMapPointer(stage: Konva.Stage): Point | null {
  const group = contentGroupRef.current
  if (group) return group.getRelativePointerPosition()
  return stage.getRelativePointerPosition()
}
