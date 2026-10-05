import { useEffect, useRef, type RefObject } from 'react'
import { contentGroupRef } from '../contentGroupRef'
import { stageRef } from '../stageRef'
import { useAppStore } from '../store'
import { getMapPointer } from '../utils/mapPointer'
import { mapToLayerLocal } from '../utils/viewport'
import type { Viewport } from '../types'

const MIN_DISTANCE = 10

function getDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function getCenter(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): { x: number; y: number } {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  }
}

export function usePinchZoom(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  getViewport: () => Viewport,
  onPreview: (viewport: Viewport) => void,
  onCommit: (viewport: Viewport) => void,
  minScale: number,
  maxScale: number,
) {
  const pointersRef = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  )
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPanCenterRef = useRef<{ x: number; y: number } | null>(null)
  const viewportRef = useRef(getViewport())
  const getViewportRef = useRef(getViewport)
  const onPreviewRef = useRef(onPreview)
  const onCommitRef = useRef(onCommit)
  getViewportRef.current = getViewport
  onPreviewRef.current = onPreview
  onCommitRef.current = onCommit

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    const pointers = pointersRef.current

    const getStagePoint = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const mapPointAtClient = (clientX: number, clientY: number) => {
      const stage = stageRef.current
      const vp = viewportRef.current
      const stagePoint = getStagePoint(clientX, clientY)

      if (stage && contentGroupRef.current) {
        stage.setPointersPositions({ clientX, clientY })
        const mapPoint = getMapPointer(stage)
        if (mapPoint) return { mapPoint, stagePoint }
      }

      return {
        mapPoint: {
          x: (stagePoint.x - vp.x) / vp.scale,
          y: (stagePoint.y - vp.y) / vp.scale,
        },
        stagePoint,
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointers.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      })
      if (pointers.size === 2) {
        const pts = [...pointers.values()]
        viewportRef.current = getViewportRef.current()
        lastPinchDistRef.current = getDistance(pts[0], pts[1])
        lastPanCenterRef.current = getCenter(pts[0], pts[1])
        e.preventDefault()
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      })

      if (pointers.size !== 2) return
      e.preventDefault()

      const pts = [...pointers.values()]
      const dist = getDistance(pts[0], pts[1])
      const center = getCenter(pts[0], pts[1])
      const vp = viewportRef.current

      if (lastPinchDistRef.current !== null && lastPinchDistRef.current > 0) {
        const scaleFactor = dist / lastPinchDistRef.current
        const oldScale = vp.scale
        const newScale = Math.min(
          maxScale,
          Math.max(minScale, oldScale * scaleFactor),
        )

        const { mapPoint, stagePoint } = mapPointAtClient(center.x, center.y)
        const mapImage = useAppStore.getState().mapImage
        const mapCenter = mapImage
          ? { x: mapImage.width / 2, y: mapImage.height / 2 }
          : { x: 0, y: 0 }
        const layerPoint = mapToLayerLocal(mapPoint, mapCenter, vp.rotation)

        let nextX = stagePoint.x - layerPoint.x * newScale
        let nextY = stagePoint.y - layerPoint.y * newScale

        if (lastPanCenterRef.current) {
          nextX += center.x - lastPanCenterRef.current.x
          nextY += center.y - lastPanCenterRef.current.y
        }

        const next = {
          scale: newScale,
          x: nextX,
          y: nextY,
          rotation: vp.rotation,
        }
        viewportRef.current = next
        onPreviewRef.current(next)
      }

      lastPinchDistRef.current = dist
      lastPanCenterRef.current = center
    }

    const onPointerUp = (e: PointerEvent) => {
      const wasPinching = lastPinchDistRef.current !== null
      pointers.delete(e.pointerId)
      if (pointers.size < 2) {
        if (wasPinching) onCommitRef.current(viewportRef.current)
        lastPinchDistRef.current = null
        lastPanCenterRef.current = null
      }
    }

    container.addEventListener('pointerdown', onPointerDown, { passive: false })
    container.addEventListener('pointermove', onPointerMove, { passive: false })
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointercancel', onPointerUp)

    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerUp)
      pointers.clear()
      lastPinchDistRef.current = null
      lastPanCenterRef.current = null
    }
  }, [containerRef, enabled, minScale, maxScale])
}

export { MIN_DISTANCE as TOUCH_DRAG_THRESHOLD }
