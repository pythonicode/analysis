import { Circle, Group, Layer, Rect, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { areExportMarkersSuppressed } from '../../utils/export'
import { stageRef } from '../../stageRef'
import { markerLabel } from '../../utils/labels'
import {
  COMMENT_FONT_SIZE,
  COMMENT_LINE_HEIGHT,
  COMMENT_MAX_TEXT_WIDTH,
  COMMENT_PADDING,
  clampCommentBoxWidth,
  measureCommentBox,
  textWidthFromRightEdge,
} from '../../utils/markerComments'
import { canUseShadow } from '../../utils/viewport'
import type { Annotation } from '../../types'
import type { LayoutMode } from '../../hooks/useLayoutMode'
import MapRotationGroup from './MapRotationGroup'
import { getMapPointer } from '../../utils/mapPointer'

const TOUCH_DRAG_THRESHOLD = 8

function commentBodyText(annotation: Annotation): string {
  return annotation.comment.trim() || '…'
}

function resolveTextWidth(
  annotation: Annotation,
  previewWidth?: number,
): number {
  if (previewWidth !== undefined) return clampCommentBoxWidth(previewWidth)
  if (annotation.commentBoxWidth !== undefined) {
    return clampCommentBoxWidth(annotation.commentBoxWidth)
  }
  const text = commentBodyText(annotation)
  const metrics = measureCommentBox(
    text,
    COMMENT_MAX_TEXT_WIDTH,
    COMMENT_FONT_SIZE,
    COMMENT_PADDING,
    { shrinkToContent: true },
  )
  return clampCommentBoxWidth(metrics.width - COMMENT_PADDING * 2)
}

function measureForAnnotation(
  annotation: Annotation,
  previewTextWidth?: number,
) {
  const text = commentBodyText(annotation)
  const hasExplicitWidth =
    previewTextWidth !== undefined || annotation.commentBoxWidth !== undefined
  const maxTextWidth = resolveTextWidth(annotation, previewTextWidth)

  return {
    isPlaceholder: annotation.comment.trim() === '',
    ...measureCommentBox(text, maxTextWidth, COMMENT_FONT_SIZE, COMMENT_PADDING, {
      shrinkToContent: !hasExplicitWidth,
    }),
    textWidth: maxTextWidth,
  }
}

function CommentLabelBadge({
  label,
  color,
  boxWidth,
  boxHeight,
}: {
  label: string
  color: string
  boxWidth: number
  boxHeight: number
}) {
  const badgeRadius = label.length === 1 ? 5 : 5.5
  const badgeInset = 2
  const x = boxWidth / 2 - badgeRadius - badgeInset
  const y = boxHeight / 2 - badgeRadius - badgeInset

  return (
    <>
      <Circle
        x={x}
        y={y}
        radius={badgeRadius}
        fill={color}
        stroke="#ffffff"
        strokeWidth={0.75}
        listening={false}
      />
      <Text
        text={label}
        x={x}
        y={y}
        fill="#ffffff"
        fontStyle="bold"
        fontSize={label.length === 1 ? 6 : 4.5}
        width={badgeRadius * 2}
        height={badgeRadius * 2}
        offsetX={badgeRadius}
        offsetY={badgeRadius}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </>
  )
}

function CommentBox({
  annotation,
  index,
  selected,
  previewTextWidth,
  viewportScale,
  layoutMode,
  onResizePointerDown,
}: {
  annotation: Annotation
  index: number
  selected: boolean
  previewTextWidth?: number
  viewportScale: number
  layoutMode: LayoutMode
  onResizePointerDown: (e: KonvaEventObject<PointerEvent>) => void
}) {
  const { width, height, lineText, textWidth, isPlaceholder } =
    measureForAnnotation(annotation, previewTextWidth)
  const gripWidth = Math.max(10 / viewportScale, 6)
  const label = markerLabel(index)
  const isTouch = layoutMode === 'touch'
  const hitPadding = isTouch ? Math.max(6 / viewportScale, 3) : 0
  const useShadow = canUseShadow(width, viewportScale)

  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill="rgba(255, 255, 255, 0.94)"
        stroke={selected ? '#08060d' : '#c4c4cc'}
        strokeWidth={selected ? 1.5 : 1}
        cornerRadius={4}
        shadowColor={useShadow ? '#000000' : undefined}
        shadowBlur={useShadow ? 4 : 0}
        shadowOpacity={useShadow ? 0.22 : 0}
        shadowOffsetY={useShadow ? 1 : 0}
        hitStrokeWidth={hitPadding}
      />
      <Text
        x={-width / 2 + COMMENT_PADDING}
        y={-height / 2 + COMMENT_PADDING}
        text={lineText}
        width={textWidth}
        fontSize={COMMENT_FONT_SIZE}
        lineHeight={COMMENT_LINE_HEIGHT}
        fill={isPlaceholder ? '#71717a' : '#18181b'}
        fontStyle={isPlaceholder ? 'italic' : 'normal'}
        listening={false}
      />
      <CommentLabelBadge
        label={label}
        color={annotation.color}
        boxWidth={width}
        boxHeight={height}
      />
      {selected && (
        <>
          <Rect
            x={width / 2 - gripWidth}
            y={-height / 2}
            width={gripWidth}
            height={height}
            fill="rgba(8, 6, 13, 0.06)"
            cornerRadius={[0, 4, 4, 0]}
            listening={false}
          />
          <Rect
            x={width / 2 - gripWidth / 2}
            y={-height / 2}
            width={gripWidth}
            height={height}
            fill="transparent"
            onPointerDown={onResizePointerDown}
          />
          <Circle
            x={width / 2}
            y={0}
            radius={4 / viewportScale}
            fill="#ffffff"
            stroke="#08060d"
            strokeWidth={1.5 / viewportScale}
            listening={false}
          />
        </>
      )}
    </>
  )
}

export default function MarkersLayer({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const annotations = useAppStore((s) => s.annotations)
  const activeTool = useAppStore((s) => s.activeTool)
  const selectedId = useAppStore((s) => s.selectedId)
  const markerDisplayMode = useAppStore((s) => s.markerDisplayMode)
  const viewportScale = useAppStore((s) => s.viewport.scale)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updateAnnotation = useAppStore((s) => s.updateAnnotation)

  const selectable = activeTool === 'select'
  const isTouch = layoutMode === 'touch'
  const hitMultiplier = isTouch ? 1.5 : 1
  const showComments = markerDisplayMode === 'comments'

  const [resizingId, setResizingId] = useState<string | null>(null)
  const [previewWidths, setPreviewWidths] = useState<Record<string, number>>({})
  const previewWidthsRef = useRef(previewWidths)
  previewWidthsRef.current = previewWidths

  useEffect(() => {
    if (!resizingId) return

    const annotation = annotations.find((item) => item.id === resizingId)
    if (!annotation) return

    const onPointerMove = (e: PointerEvent) => {
      const stage = stageRef.current
      if (!stage) return
      stage.setPointersPositions(e)
      const pos = getMapPointer(stage)
      if (!pos) return

      const localRightEdge = pos.x - annotation.position.x
      const textWidth = textWidthFromRightEdge(localRightEdge)
      setPreviewWidths((current) => ({ ...current, [resizingId]: textWidth }))
    }

    const onPointerUp = () => {
      const textWidth = previewWidthsRef.current[resizingId]
      if (textWidth !== undefined) {
        updateAnnotation(resizingId, { commentBoxWidth: textWidth })
      }
      setPreviewWidths((current) => {
        const next = { ...current }
        delete next[resizingId]
        return next
      })
      setResizingId(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [annotations, resizingId, updateAnnotation])

  const beginResize = (
    e: KonvaEventObject<PointerEvent>,
    annotation: Annotation,
  ) => {
    e.cancelBubble = true
    e.evt.preventDefault()

    const stage = stageRef.current
    let startWidth = resolveTextWidth(annotation)
    if (stage) {
      stage.setPointersPositions(e.evt)
      const pos = getMapPointer(stage)
      if (pos) {
        startWidth = textWidthFromRightEdge(pos.x - annotation.position.x)
      }
    }

    setPreviewWidths((current) => ({
      ...current,
      [annotation.id]: startWidth,
    }))
    setResizingId(annotation.id)
  }

  const commitDrag = (id: string, e: KonvaEventObject<DragEvent>) => {
    if (resizingId === id) return
    updateAnnotation(id, {
      position: { x: e.target.x(), y: e.target.y() },
    })
  }

  if (areExportMarkersSuppressed()) {
    return <Layer />
  }

  return (
    <Layer>
      <MapRotationGroup>
        {annotations.map((annotation, index) => {
        const selected = selectedId === annotation.id
        const radius = annotation.size
        const label = markerLabel(index)
        const previewTextWidth = previewWidths[annotation.id]
        const isResizing = resizingId === annotation.id
        const markerShadow = canUseShadow(radius * 2, viewportScale)

        return (
          <Group
            key={annotation.id}
            id={annotation.id}
            x={annotation.position.x}
            y={annotation.position.y}
            draggable={selectable && !isResizing}
            dragDistance={isTouch ? TOUCH_DRAG_THRESHOLD : 0}
            onClick={() => selectable && setSelectedId(annotation.id)}
            onTap={() => selectable && setSelectedId(annotation.id)}
            onDragStart={() => setSelectedId(annotation.id)}
            onDragEnd={(e) => commitDrag(annotation.id, e)}
          >
            {showComments ? (
              <CommentBox
                annotation={annotation}
                index={index}
                selected={selectable && selected}
                previewTextWidth={previewTextWidth}
                viewportScale={viewportScale}
                layoutMode={layoutMode}
                onResizePointerDown={(e) => beginResize(e, annotation)}
              />
            ) : (
              <Circle
                radius={radius}
                fill={annotation.color}
                stroke={selected ? '#08060d' : '#ffffff'}
                strokeWidth={radius * (selected ? 0.25 : 0.15)}
                hitStrokeWidth={Math.max(radius * hitMultiplier, 10)}
                shadowColor={markerShadow ? '#000000' : undefined}
                shadowBlur={markerShadow ? radius * 0.4 : 0}
                shadowOpacity={markerShadow ? 0.3 : 0}
              />
            )}
            {!showComments && (
              <Text
                text={label}
                fill="#ffffff"
                fontStyle="bold"
                fontSize={
                  radius *
                  (label.length === 1 ? 1.2 : label.length === 2 ? 0.85 : 0.6)
                }
                width={radius * 2}
                height={radius * 2}
                offsetX={radius}
                offsetY={radius}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            )}
          </Group>
        )
      })}
      </MapRotationGroup>
    </Layer>
  )
}
