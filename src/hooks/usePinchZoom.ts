import { useEffect, useRef, type RefObject } from 'react'
import type { Viewport } from '../types'
import { pinchViewport } from '../utils/viewport'

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

/**
 * Two-finger pinch-zoom and pan on the canvas. The viewport is the stage's
 * transform: the point between the fingers stays under them while the scale
 * and position change. onGestureStart/onGestureEnd let the canvas stop any
 * one-finger drag that is still running, so the two do not fight over the stage.
 */
export function usePinchZoom(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  getViewport: () => Viewport,
  onPreview: (viewport: Viewport) => void,
  onCommit: (viewport: Viewport) => void,
  minScale: number,
  maxScale: number,
  onGestureStart?: () => void,
  onGestureEnd?: () => void,
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
  const onGestureStartRef = useRef(onGestureStart)
  const onGestureEndRef = useRef(onGestureEnd)
  getViewportRef.current = getViewport
  onPreviewRef.current = onPreview
  onCommitRef.current = onCommit
  onGestureStartRef.current = onGestureStart
  onGestureEndRef.current = onGestureEnd

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    const pointers = pointersRef.current

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
        lastPanCenterRef.current = toCanvas(getCenter(pts[0], pts[1]))
        onGestureStartRef.current?.()
        e.preventDefault()
      }
    }

    /** Finger centre in canvas (container) coordinates, matching the viewport's x/y. */
    const toCanvas = (point: { x: number; y: number }) => {
      const rect = container.getBoundingClientRect()
      return { x: point.x - rect.left, y: point.y - rect.top }
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
      const center = toCanvas(getCenter(pts[0], pts[1]))
      const vp = viewportRef.current

      const lastCenter = lastPanCenterRef.current
      if (
        lastPinchDistRef.current !== null &&
        lastPinchDistRef.current > 0 &&
        lastCenter
      ) {
        const next = pinchViewport(
          vp,
          lastCenter,
          center,
          dist / lastPinchDistRef.current,
          minScale,
          maxScale,
        )
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
        if (wasPinching) {
          onCommitRef.current(viewportRef.current)
          onGestureEndRef.current?.()
        }
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
