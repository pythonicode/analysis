import { markerLabel } from './labels'
import {
  COMMENT_FONT_SIZE,
  COMMENT_LINE_HEIGHT,
  COMMENT_PADDING,
  clampCommentBoxWidth,
  measureCommentBox,
} from './markerComments'
import type { Annotation } from '../types'

const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif'

function drawCommentMarker(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  index: number,
  textScale: number,
): void {
  const text = annotation.comment.trim() || '…'
  const fontSize = COMMENT_FONT_SIZE * textScale
  const padding = COMMENT_PADDING * textScale
  const maxTextWidth = annotation.commentBoxWidth
    ? clampCommentBoxWidth(annotation.commentBoxWidth) * textScale
    : undefined

  const metrics = measureCommentBox(
    text,
    maxTextWidth,
    fontSize,
    padding,
    { shrinkToContent: maxTextWidth === undefined },
  )

  const { x, y } = annotation.position
  const left = x - metrics.width / 2
  const top = y - metrics.height / 2

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.strokeStyle = '#c4c4cc'
  ctx.lineWidth = 1
  roundRect(ctx, left, top, metrics.width, metrics.height, 4 * textScale)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = annotation.comment.trim() ? '#18181b' : '#71717a'
  ctx.font = `${annotation.comment.trim() ? '500' : 'italic'} ${fontSize}px ${FONT}`
  const lineHeight = fontSize * COMMENT_LINE_HEIGHT
  const lines = metrics.lineText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, left + padding, top + padding + fontSize * 0.85 + i * lineHeight)
  }

  const label = markerLabel(index)
  const badgeRadius = label.length === 1 ? 5 : 5.5
  const badgeInset = 2
  const badgeX = left + metrics.width - badgeRadius - badgeInset
  const badgeY = top + metrics.height - badgeRadius - badgeInset

  ctx.fillStyle = annotation.color
  ctx.beginPath()
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 0.75
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${badgeRadius * (label.length > 1 ? 0.85 : 1.1)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, badgeX, badgeY)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawLabelMarker(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  index: number,
): void {
  const { x, y } = annotation.position
  const radius = annotation.size
  const label = markerLabel(index)

  ctx.fillStyle = annotation.color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1, radius * 0.15)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${radius * (label.length === 1 ? 1.2 : label.length === 2 ? 0.85 : 0.6)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, y)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function drawMapMarkers(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  displayMode: 'labels' | 'comments',
  textScale: number,
): void {
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i]!
    if (displayMode === 'comments') {
      drawCommentMarker(ctx, annotation, i, textScale)
    } else {
      drawLabelMarker(ctx, annotation, i)
    }
  }
}
