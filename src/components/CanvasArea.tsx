import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { ImagePlus } from 'lucide-react'
import { useAppStore } from '../store'
import { stageRef } from '../stageRef'
import { simplifyPath } from '../utils/geometry'
import { importDroppedFiles } from '../utils/files'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { usePinchZoom } from '../hooks/usePinchZoom'
import MapImageLayer from './canvas/MapImageLayer'
import GpxLayer from './canvas/GpxLayer'
import DrawingLayer, { type DraftStroke } from './canvas/DrawingLayer'
import MarkersLayer from './canvas/MarkersLayer'

const MIN_SCALE = 0.05
const MAX_SCALE = 8
const ZOOM_FACTOR = 1.06

export default function CanvasArea({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const activeTool = useAppStore((s) => s.activeTool)
  const mapImage = useAppStore((s) => s.mapImage)
  const viewport = useAppStore((s) => s.viewport)
  const setViewport = useAppStore((s) => s.setViewport)
  const setPointer = useAppStore((s) => s.setPointer)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const strokeWidth = useAppStore((s) => s.strokeWidth)
  const strokeColor = useAppStore((s) => s.strokeColor)
  const strokeOpacity = useAppStore((s) => s.strokeOpacity)
  const addPath = useAppStore((s) => s.addPath)
  const addAnnotation = useAppStore((s) => s.addAnnotation)
  const openAnnotations = useAppStore((s) => s.openAnnotations)
  const closeAnnotations = useAppStore((s) => s.closeAnnotations)

  const containerRef = useRef<HTMLDivElement>(null)
  const middlePanRef = useRef<{
    startX: number
    startY: number
    viewportX: number
    viewportY: number
  } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [middleMouseHeld, setMiddleMouseHeld] = useState(false)
  const [draft, setDraft] = useState<DraftStroke | null>(null)
  const lastFittedSrc = useRef<string | null>(null)
  const erasingRef = useRef(false)

  const isTouch = layoutMode === 'touch'
  const isDrawingTool = activeTool === 'line'
  const isPanning =
    activeTool === 'pan' ||
    (!isTouch && (spaceHeld || middleMouseHeld))

  usePinchZoom(
    containerRef,
    isTouch,
    viewport,
    setViewport,
    MIN_SCALE,
    MAX_SCALE,
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!mapImage || size.width === 0 || size.height === 0) return
    if (lastFittedSrc.current === mapImage.src) return
    lastFittedSrc.current = mapImage.src
    const scale =
      Math.min(size.width / mapImage.width, size.height / mapImage.height) *
      0.95
    setViewport({
      scale,
      x: (size.width - mapImage.width * scale) / 2,
      y: (size.height - mapImage.height * scale) / 2,
    })
  }, [mapImage, size, setViewport])

  useEffect(() => {
    const isEditableTarget = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e)) return
      if (!isTouch && e.code === 'Space') {
        e.preventDefault()
        setSpaceHeld(true)
        return
      }
      const state = useAppStore.getState()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) state.redo()
        else state.undo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        state.redo()
        return
      }
      if (e.key === 'Escape') {
        if (state.activeTool === 'gpx') state.setActiveTool('select')
        else state.setSelectedId(null)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
        const id = state.selectedId
        if (state.paths.some((p) => p.id === id)) state.removePath(id)
        else if (state.annotations.some((a) => a.id === id))
          state.removeAnnotation(id)
        state.setSelectedId(null)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isTouch && e.code === 'Space') setSpaceHeld(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isTouch])

  useEffect(() => {
    if (isTouch) return

    const endMiddlePan = () => {
      middlePanRef.current = null
      setMiddleMouseHeld(false)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 1) endMiddlePan()
    }

    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [isTouch])

  const attachStage = useCallback((node: Konva.Stage | null) => {
    stageRef.current = node
  }, [])

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldScale = viewport.scale
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR,
      ),
    )
    const mapPoint = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    }
    setViewport({
      scale: newScale,
      x: pointer.x - mapPoint.x * newScale,
      y: pointer.y - mapPoint.y * newScale,
    })
  }

  const eraseAtPointer = (stage: Konva.Stage) => {
    const screenPos = stage.getPointerPosition()
    if (!screenPos) return
    const shape = stage.getIntersection(screenPos)
    if (!shape) return

    const state = useAppStore.getState()
    let node: Konva.Node | null = shape
    while (node && node !== stage) {
      const id = node.id()
      if (id) {
        if (state.paths.some((p) => p.id === id)) {
          state.removePath(id)
          if (state.selectedId === id) state.setSelectedId(null)
          return
        }
        if (state.annotations.some((a) => a.id === id)) {
          state.removeAnnotation(id)
          if (state.selectedId === id) state.setSelectedId(null)
          return
        }
      }
      node = node.getParent()
    }
  }

  const shouldCloseAnnotations = () => {
    if (!isTouch) return
    const active = document.activeElement
    if (
      active instanceof HTMLTextAreaElement &&
      active.classList.contains('annotation-comment-input')
    ) {
      return false
    }
    closeAnnotations()
  }

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    if (!isTouch && e.evt.button === 1) {
      e.evt.preventDefault()
      middlePanRef.current = {
        startX: e.evt.clientX,
        startY: e.evt.clientY,
        viewportX: viewport.x,
        viewportY: viewport.y,
      }
      setMiddleMouseHeld(true)
      return
    }

    if (isPanning) {
      shouldCloseAnnotations()
      return
    }
    if (e.evt.button !== undefined && e.evt.button !== 0) return
    const pos = stage.getRelativePointerPosition()
    if (!pos) return

    shouldCloseAnnotations()

    if (activeTool === 'eraser') {
      erasingRef.current = true
      eraseAtPointer(stage)
    } else if (isDrawingTool) {
      setDraft({
        points: [pos.x, pos.y],
        width: strokeWidth,
        color: strokeColor,
        opacity: strokeOpacity,
      })
    } else if (activeTool === 'marker') {
      const annotation = {
        id: crypto.randomUUID(),
        position: { x: pos.x, y: pos.y },
        comment: '',
        size: strokeWidth * 2,
        color: strokeColor,
      }
      addAnnotation(annotation)
      setSelectedId(annotation.id)
      if (isTouch) openAnnotations()
    } else if (activeTool === 'select' && e.target === stage) {
      setSelectedId(null)
    }
  }

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    if (!isTouch && middlePanRef.current) {
      const pan = middlePanRef.current
      setViewport({
        scale: viewport.scale,
        x: pan.viewportX + (e.evt.clientX - pan.startX),
        y: pan.viewportY + (e.evt.clientY - pan.startY),
      })
      return
    }

    const pos = stage.getRelativePointerPosition()
    if (!pos) return
    setPointer({ x: pos.x, y: pos.y })

    if (erasingRef.current && activeTool === 'eraser') {
      eraseAtPointer(stage)
      return
    }

    if (draft) {
      const pts = draft.points
      const lastX = pts[pts.length - 2]
      const lastY = pts[pts.length - 1]
      const minDist = (isTouch ? 5 : 3) / viewport.scale
      if (Math.hypot(pos.x - lastX, pos.y - lastY) >= minDist) {
        setDraft({ ...draft, points: [...pts, pos.x, pos.y] })
      }
    }
  }

  const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
    if (!isTouch && e.evt.button === 1) {
      middlePanRef.current = null
      setMiddleMouseHeld(false)
    }
    commitDraft()
  }

  const commitDraft = () => {
    erasingRef.current = false
    if (!draft) return
    setDraft(null)
    if (draft.points.length < 4) return
    addPath({
      id: crypto.randomUUID(),
      points: simplifyPath(draft.points, 1.5 / viewport.scale),
      width: draft.width,
      color: draft.color,
      opacity: draft.opacity,
    })
  }

  const syncViewportFromStage = (e: KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (!stage || e.target !== stage) return
    setViewport({ scale: stage.scaleX(), x: stage.x(), y: stage.y() })
  }

  const cursor = isPanning
    ? middleMouseHeld
      ? 'grabbing'
      : 'grab'
    : isDrawingTool ||
        activeTool === 'marker' ||
        activeTool === 'eraser' ||
        activeTool === 'gpx'
      ? 'crosshair'
      : 'default'

  return (
    <main
      className={`canvas-area${isTouch ? ' canvas-area-touch' : ''}`}
      ref={containerRef}
      style={{ cursor }}
      onDragOver={(e) => e.preventDefault()}
      onAuxClick={(e) => e.button === 1 && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (e.dataTransfer.files.length > 0) {
          void importDroppedFiles(e.dataTransfer.files)
        }
      }}
    >
      <Stage
        ref={attachStage}
        width={size.width}
        height={size.height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.x}
        y={viewport.y}
        draggable={isPanning}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setPointer(null)
          middlePanRef.current = null
          setMiddleMouseHeld(false)
          commitDraft()
        }}
        onDragMove={syncViewportFromStage}
        onDragEnd={syncViewportFromStage}
      >
        <MapImageLayer />
        <GpxLayer layoutMode={layoutMode} />
        <DrawingLayer draft={draft} layoutMode={layoutMode} />
        <MarkersLayer layoutMode={layoutMode} />
      </Stage>

      {!mapImage && (
        <div className="canvas-empty">
          <div className="canvas-empty-card">
            <ImagePlus size={40} aria-hidden />
            <h2>No map loaded</h2>
            <p>
              {isTouch
                ? 'Import a map image from the menu to get started.'
                : 'Import a map image to get started, or drop a file here.'}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
