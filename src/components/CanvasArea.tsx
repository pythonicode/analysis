import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { ImagePlus } from 'lucide-react'
import { useAppStore } from '../store'
import { stageRef } from '../stageRef'
import { simplifyPath } from '../utils/geometry'
import { importDroppedFiles, importImageFile } from '../utils/files'
import { openSampleProject } from '../utils/project'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { usePinchZoom } from '../hooks/usePinchZoom'
import MapImageLayer from './canvas/MapImageLayer'
import GpxLayer from './canvas/GpxLayer'
import DrawingLayer, { type DraftStroke } from './canvas/DrawingLayer'
import MarkersLayer from './canvas/MarkersLayer'
import {
  MAX_SCALE,
  MIN_SCALE,
  clampViewport,
  mapToLayerLocal,
  rotatedBounds,
} from '../utils/viewport'
import { getMapPointer } from '../utils/mapPointer'
import type { Point, Viewport } from '../types'

const ZOOM_FACTOR = 1.06
const WHEEL_COMMIT_MS = 120

function applyStageViewport(stage: Konva.Stage, viewport: Viewport) {
  stage.scale({ x: viewport.scale, y: viewport.scale })
  stage.position({ x: viewport.x, y: viewport.y })
  stage.batchDraw()
}

export default function CanvasArea({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const activeTool = useAppStore((s) => s.activeTool)
  const mapImage = useAppStore((s) => s.mapImage)
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
  const viewportRef = useRef(useAppStore.getState().viewport)
  const gestureRef = useRef(false)
  const zoomFrameRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<Viewport | null>(null)
  const wheelCommitRef = useRef<number | null>(null)
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
  const draftRef = useRef<DraftStroke | null>(null)
  const draftLineRef = useRef<Konva.Line | null>(null)
  const draftRafRef = useRef<number | null>(null)
  const pointerBucketRef = useRef<{ x: number; y: number } | null>(null)
  const [loadingSample, setLoadingSample] = useState(false)
  const mapInputRef = useRef<HTMLInputElement>(null)
  const lastFittedSrc = useRef<string | null>(null)
  const erasingRef = useRef(false)

  const commitViewport = useCallback(
    (viewport: Viewport) => {
      if (zoomFrameRef.current != null) {
        cancelAnimationFrame(zoomFrameRef.current)
        zoomFrameRef.current = null
      }
      if (wheelCommitRef.current != null) {
        window.clearTimeout(wheelCommitRef.current)
        wheelCommitRef.current = null
      }
      pendingZoomRef.current = null
      const next = clampViewport(viewport)
      gestureRef.current = false
      viewportRef.current = next
      setViewport(next)
      const stage = stageRef.current
      if (stage) applyStageViewport(stage, next)
    },
    [setViewport],
  )

  const previewZoom = useCallback((viewport: Viewport) => {
    const next = clampViewport(viewport)
    gestureRef.current = true
    viewportRef.current = next
    const stage = stageRef.current
    if (stage) applyStageViewport(stage, next)
    pendingZoomRef.current = next
    if (zoomFrameRef.current != null) return
    zoomFrameRef.current = requestAnimationFrame(() => {
      zoomFrameRef.current = null
      const pending = pendingZoomRef.current
      if (!pending || !gestureRef.current) return
      const rotation = useAppStore.getState().viewport.rotation
      viewportRef.current = { ...viewportRef.current, rotation }
      setViewport({ ...pending, rotation })
    })
  }, [setViewport])

  const publishPointer = useCallback(
    (pos: Point | null) => {
      if (!pos) {
        if (pointerBucketRef.current === null) return
        pointerBucketRef.current = null
        setPointer(null)
        return
      }
      const x = Math.round(pos.x)
      const y = Math.round(pos.y)
      const prev = pointerBucketRef.current
      if (prev && prev.x === x && prev.y === y) return
      pointerBucketRef.current = { x, y }
      setPointer({ x, y })
    },
    [setPointer],
  )

  const isTouch = layoutMode === 'touch'
  const isDrawingTool = activeTool === 'line'
  const isPanning =
    activeTool === 'pan' ||
    (!isTouch && (spaceHeld || middleMouseHeld))

  usePinchZoom(
    containerRef,
    isTouch,
    () => viewportRef.current,
    previewZoom,
    commitViewport,
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
    return useAppStore.subscribe((state, prev) => {
      if (state.viewport === prev.viewport) return
      if (gestureRef.current) {
        if (state.viewport.rotation !== prev.viewport.rotation) {
          viewportRef.current = state.viewport
          const stage = stageRef.current
          if (stage) applyStageViewport(stage, state.viewport)
        }
        return
      }
      viewportRef.current = state.viewport
      const stage = stageRef.current
      if (stage) applyStageViewport(stage, state.viewport)
    })
  }, [])

  useEffect(() => {
    if (!mapImage || size.width === 0 || size.height === 0) return
    if (lastFittedSrc.current === mapImage.src) return
    lastFittedSrc.current = mapImage.src
    const rotation = useAppStore.getState().viewport.rotation
    const center = { x: mapImage.width / 2, y: mapImage.height / 2 }
    const bounds = rotatedBounds(mapImage.width, mapImage.height, rotation)
    const scale =
      Math.min(size.width / bounds.width, size.height / bounds.height) * 0.95
    commitViewport({
      scale,
      rotation,
      x: size.width / 2 - center.x * scale,
      y: size.height / 2 - center.y * scale,
    })
  }, [mapImage, size, commitViewport])

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

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 1 || !middlePanRef.current) return
      middlePanRef.current = null
      commitViewport(viewportRef.current)
      setMiddleMouseHeld(false)
    }

    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [isTouch, commitViewport])

  const attachStage = useCallback((node: Konva.Stage | null) => {
    stageRef.current = node
    if (node) applyStageViewport(node, viewportRef.current)
  }, [])

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const viewport = viewportRef.current
    const oldScale = viewport.scale
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR,
      ),
    )
    const mapPoint = getMapPointer(stage)
    if (!mapPoint) return
    const image = useAppStore.getState().mapImage
    const center = image
      ? { x: image.width / 2, y: image.height / 2 }
      : { x: 0, y: 0 }
    const layerPoint = mapToLayerLocal(mapPoint, center, viewport.rotation)
    previewZoom({
      scale: newScale,
      rotation: viewport.rotation,
      x: pointer.x - layerPoint.x * newScale,
      y: pointer.y - layerPoint.y * newScale,
    })
    if (wheelCommitRef.current != null) {
      window.clearTimeout(wheelCommitRef.current)
    }
    wheelCommitRef.current = window.setTimeout(() => {
      wheelCommitRef.current = null
      commitViewport(viewportRef.current)
    }, WHEEL_COMMIT_MS)
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
      const viewport = viewportRef.current
      middlePanRef.current = {
        startX: e.evt.clientX,
        startY: e.evt.clientY,
        viewportX: viewport.x,
        viewportY: viewport.y,
      }
      gestureRef.current = true
      setMiddleMouseHeld(true)
      return
    }

    if (isPanning) {
      shouldCloseAnnotations()
      return
    }
    if (e.evt.button !== undefined && e.evt.button !== 0) return
    const pos = getMapPointer(stage)
    if (!pos) return

    shouldCloseAnnotations()

    if (activeTool === 'eraser') {
      erasingRef.current = true
      eraseAtPointer(stage)
    } else if (isDrawingTool) {
      draftRef.current = {
        points: [pos.x, pos.y],
        width: strokeWidth,
        color: strokeColor,
        opacity: strokeOpacity,
      }
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
      const viewport = viewportRef.current
      const next = {
        ...viewport,
        x: pan.viewportX + (e.evt.clientX - pan.startX),
        y: pan.viewportY + (e.evt.clientY - pan.startY),
      }
      gestureRef.current = true
      viewportRef.current = next
      stage.position({ x: next.x, y: next.y })
      stage.batchDraw()
      return
    }

    const pos = getMapPointer(stage)
    if (!pos) return
    publishPointer(pos)

    if (erasingRef.current && activeTool === 'eraser') {
      eraseAtPointer(stage)
      return
    }

    const draftStroke = draftRef.current
    if (draftStroke) {
      const pts = draftStroke.points
      const lastX = pts[pts.length - 2]
      const lastY = pts[pts.length - 1]
      const minDist = (isTouch ? 5 : 3) / viewportRef.current.scale
      if (
        lastX === undefined ||
        lastY === undefined ||
        Math.hypot(pos.x - lastX, pos.y - lastY) >= minDist
      ) {
        pts.push(pos.x, pos.y)
        if (pts.length === 4) {
          setDraft({ ...draftStroke, points: pts })
        } else if (pts.length > 4) {
          if (draftRafRef.current == null) {
            draftRafRef.current = requestAnimationFrame(() => {
              draftRafRef.current = null
              const line = draftLineRef.current
              const current = draftRef.current
              if (!line || !current) return
              line.points(current.points)
              line.getLayer()?.batchDraw()
            })
          }
        }
      }
    }
  }

  const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
    if (!isTouch && e.evt.button === 1 && middlePanRef.current) {
      middlePanRef.current = null
      commitViewport(viewportRef.current)
      setMiddleMouseHeld(false)
    }
    commitDraft()
  }

  const commitDraft = () => {
    erasingRef.current = false
    if (draftRafRef.current != null) {
      cancelAnimationFrame(draftRafRef.current)
      draftRafRef.current = null
    }
    const stroke = draftRef.current
    draftRef.current = null
    if (!stroke) return
    setDraft(null)
    if (stroke.points.length < 4) return
    addPath({
      id: crypto.randomUUID(),
      points: simplifyPath(stroke.points.slice(), 1.5 / viewportRef.current.scale),
      width: stroke.width,
      color: stroke.color,
      opacity: stroke.opacity,
    })
  }

  const beginStageDrag = (e: KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (!stage || e.target !== stage) return
    gestureRef.current = true
  }

  const syncViewportFromStage = (e: KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (!stage || e.target !== stage) return
    commitViewport({
      scale: stage.scaleX(),
      x: stage.x(),
      y: stage.y(),
      rotation: viewportRef.current.rotation,
    })
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

  const handleLoadSample = useCallback(async () => {
    setLoadingSample(true)
    try {
      await openSampleProject()
    } finally {
      setLoadingSample(false)
    }
  }, [])

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
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={attachStage}
          width={size.width}
          height={size.height}
          draggable={isPanning}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            publishPointer(null)
            if (middlePanRef.current) {
              middlePanRef.current = null
              commitViewport(viewportRef.current)
            }
            setMiddleMouseHeld(false)
            commitDraft()
          }}
          onDragStart={beginStageDrag}
          onDragEnd={syncViewportFromStage}
        >
          <MapImageLayer />
          <GpxLayer layoutMode={layoutMode} />
          <DrawingLayer
            draft={draft}
            draftLineRef={draftLineRef}
            layoutMode={layoutMode}
          />
          <MarkersLayer layoutMode={layoutMode} />
        </Stage>
      )}

      {!mapImage && (
        <div className="canvas-empty">
          <div className="canvas-empty-card">
            <ImagePlus size={40} aria-hidden />
            <h2>No map loaded</h2>
            <p>
              {isTouch
                ? 'Import a map image to get started.'
                : 'Import a map image to get started, or drop a file here.'}
            </p>
            <input
              ref={mapInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importImageFile(file)
                e.target.value = ''
              }}
            />
            <div className="canvas-empty-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={loadingSample}
                onClick={() => mapInputRef.current?.click()}
              >
                <ImagePlus size={14} aria-hidden />
                Import Map
              </button>
              <button
                type="button"
                className="button button-outline"
                disabled={loadingSample}
                onClick={() => void handleLoadSample()}
              >
                {loadingSample ? 'Loading sample…' : 'Open Sample Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
