import { useEffect, useRef, type RefObject } from 'react'
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
  viewport: Viewport,
  setViewport: (v: Viewport) => void,
  minScale: number,
  maxScale: number,
) {
  const pointersRef = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  )
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPanCenterRef = useRef<{ x: number; y: number } | null>(null)
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const getStagePoint = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      pointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      })
      if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()]
        lastPinchDistRef.current = getDistance(pts[0], pts[1])
        lastPanCenterRef.current = getCenter(pts[0], pts[1])
        e.preventDefault()
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      })

      if (pointersRef.current.size !== 2) return
      e.preventDefault()

      const pts = [...pointersRef.current.values()]
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

        const stagePoint = getStagePoint(center.x, center.y)
        const mapPoint = {
          x: (stagePoint.x - vp.x) / oldScale,
          y: (stagePoint.y - vp.y) / oldScale,
        }

        let nextX = stagePoint.x - mapPoint.x * newScale
        let nextY = stagePoint.y - mapPoint.y * newScale

        if (lastPanCenterRef.current) {
          nextX += center.x - lastPanCenterRef.current.x
          nextY += center.y - lastPanCenterRef.current.y
        }

        setViewport({ scale: newScale, x: nextX, y: nextY })
      }

      lastPinchDistRef.current = dist
      lastPanCenterRef.current = center
    }

    const onPointerUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) {
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
      pointersRef.current.clear()
      lastPinchDistRef.current = null
      lastPanCenterRef.current = null
    }
  }, [containerRef, enabled, setViewport, minScale, maxScale])
}

export { MIN_DISTANCE as TOUCH_DRAG_THRESHOLD }
