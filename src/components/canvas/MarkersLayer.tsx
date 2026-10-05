import { Circle, Group, Layer, Rect, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { areExportMarkersSuppressed } from '../../utils/export'
import { stageRef } from '../../stageRef'
import { annotationTextScaleMultiplier } from '../../utils/annotationTextScale'
import { markerLabel } from '../../utils/labels'
import {
  COMMENT_FONT_SIZE,
  COMMENT_LINE_HEIGHT,
  COMMENT_MAX_TEXT_WIDTH,
  COMMENT_PADDING,
  clampCommentBoxWidth,
  commentLabelBadgeLayout,
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
  textScale: number,
  previewTextWidth?: number,
) {
  const text = commentBodyText(annotation)
  const hasExplicitWidth =
    previewTextWidth !== undefined || annotation.commentBoxWidth !== undefined
  const storedTextWidth = resolveTextWidth(annotation, previewTextWidth)
  const fontSize = COMMENT_FONT_SIZE * textScale
  const padding = COMMENT_PADDING * textScale
  const maxTextWidth = storedTextWidth * textScale

  return {
    isPlaceholder: annotation.comment.trim() === '',
    ...measureCommentBox(text, maxTextWidth, fontSize, padding, {
      shrinkToContent: !hasExplicitWidth,
    }),
    textWidth: maxTextWidth,
    fontSize,
    padding,
  }
}

function CommentLabelBadge({
  label,
  color,
  boxWidth,
  boxHeight,
  textScale,
}: {
  label: string
  color: string
  boxWidth: number
  boxHeight: number
  textScale: number
}) {
  const badge = commentLabelBadgeLayout(label, textScale)
  const x = -boxWidth / 2 + badge.offsetX
  const y = -boxHeight / 2 + badge.offsetY

  return (
    <>
      <Circle
        x={x}
        y={y}
        radius={badge.radius}
        fill={color}
        stroke="#ffffff"
        strokeWidth={0.6 * textScale}
        listening={false}
      />
      <Text
        text={label}
        x={x}
        y={y}
        fill="#ffffff"
        fontStyle="bold"
        fontSize={badge.fontSize}
        width={badge.radius * 2}
        height={badge.radius * 2}
        offsetX={badge.radius}
        offsetY={badge.radius}
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
  textScale,
  viewportScale,
  layoutMode,
  onResizePointerDown,
}: {
  annotation: Annotation
  index: number
  selected: boolean
  previewTextWidth?: number
  textScale: number
  viewportScale: number
  layoutMode: LayoutMode
  onResizePointerDown: (e: KonvaEventObject<PointerEvent>) => void
}) {
  const { width, height, lineText, textWidth, isPlaceholder, fontSize, padding } =
    useMemo(
      () => measureForAnnotation(annotation, textScale, previewTextWidth),
      [annotation, previewTextWidth, textScale],
    )
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
        cornerRadius={4 * textScale}
        shadowColor={useShadow ? '#000000' : undefined}
        shadowBlur={useShadow ? 4 : 0}
        shadowOpacity={useShadow ? 0.22 : 0}
        shadowOffsetY={useShadow ? 1 : 0}
        hitStrokeWidth={hitPadding}
      />
      <Text
        x={-width / 2 + padding}
        y={-height / 2 + padding}
        text={lineText}
        width={textWidth}
        fontSize={fontSize}
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
        textScale={textScale}
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

const MarkerNode = memo(function MarkerNode({
  annotation,
  index,
  selected,
  selectable,
  showComments,
  previewTextWidth,
  textScale,
  viewportScale,
  layoutMode,
  hitMultiplier,
  isResizing,
  onResizePointerDown,
}: {
  annotation: Annotation
  index: number
  selected: boolean
  selectable: boolean
  showComments: boolean
  previewTextWidth?: number
  textScale: number
  viewportScale: number
  layoutMode: LayoutMode
  hitMultiplier: number
  isResizing: boolean
  onResizePointerDown: (
    e: KonvaEventObject<PointerEvent>,
    annotation: Annotation,
  ) => void
}) {
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updateAnnotation = useAppStore((s) => s.updateAnnotation)
  const radius = annotation.size
  const label = markerLabel(index)
  const markerShadow = canUseShadow(radius * 2, viewportScale)
  const isTouch = layoutMode === 'touch'

  return (
    <Group
      id={annotation.id}
      x={annotation.position.x}
      y={annotation.position.y}
      draggable={selectable && !isResizing}
      dragDistance={isTouch ? TOUCH_DRAG_THRESHOLD : 0}
      onClick={() => selectable && setSelectedId(annotation.id)}
      onTap={() => selectable && setSelectedId(annotation.id)}
      onDragStart={() => setSelectedId(annotation.id)}
      onDragEnd={(e) => {
        if (isResizing) return
        updateAnnotation(annotation.id, {
          position: { x: e.target.x(), y: e.target.y() },
        })
      }}
    >
      {showComments ? (
        <CommentBox
          annotation={annotation}
          index={index}
          selected={selectable && selected}
          previewTextWidth={previewTextWidth}
          textScale={textScale}
          viewportScale={viewportScale}
          layoutMode={layoutMode}
          onResizePointerDown={(e) => onResizePointerDown(e, annotation)}
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
})

function MarkersLayer({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const annotations = useAppStore((s) => s.annotations)
  const activeTool = useAppStore((s) => s.activeTool)
  const selectedId = useAppStore((s) => s.selectedId)
  const markerDisplayMode = useAppStore((s) => s.markerDisplayMode)
  const viewportScale = useAppStore((s) => s.viewport.scale)
  const textScale = useAppStore((s) =>
    annotationTextScaleMultiplier(s.annotationTextScalePct),
  )
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
      const textWidth = textWidthFromRightEdge(localRightEdge, textScale)
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
  }, [annotations, resizingId, textScale, updateAnnotation])

  const beginResize = useCallback(
    (e: KonvaEventObject<PointerEvent>, annotation: Annotation) => {
      e.cancelBubble = true
      e.evt.preventDefault()

      const stage = stageRef.current
      let startWidth = resolveTextWidth(annotation)
      if (stage) {
        stage.setPointersPositions(e.evt)
        const pos = getMapPointer(stage)
        if (pos) {
          startWidth = textWidthFromRightEdge(
            pos.x - annotation.position.x,
            textScale,
          )
        }
      }

      setPreviewWidths((current) => ({
        ...current,
        [annotation.id]: startWidth,
      }))
      setResizingId(annotation.id)
    },
    [textScale],
  )

  if (areExportMarkersSuppressed()) {
    return <Layer />
  }

  return (
    <Layer>
      <MapRotationGroup>
        {annotations.map((annotation, index) => (
          <MarkerNode
            key={annotation.id}
            annotation={annotation}
            index={index}
            selected={selectedId === annotation.id}
            selectable={selectable}
            showComments={showComments}
            previewTextWidth={previewWidths[annotation.id]}
            textScale={textScale}
            viewportScale={viewportScale}
            layoutMode={layoutMode}
            hitMultiplier={hitMultiplier}
            isResizing={resizingId === annotation.id}
            onResizePointerDown={beginResize}
          />
        ))}
      </MapRotationGroup>
    </Layer>
  )
}

export default memo(MarkersLayer)
