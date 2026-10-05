export const COMMENT_FONT_SIZE = 8
export const COMMENT_MAX_TEXT_WIDTH = 68
export const COMMENT_PADDING = 3
export const COMMENT_LINE_HEIGHT = 1.25
export const MIN_COMMENT_BOX_WIDTH = 32
export const MAX_COMMENT_BOX_WIDTH = 220

export interface CommentLabelBadgeLayout {
  radius: number
  fontSize: number
  /** Badge center, relative to the box's top-left corner. */
  offsetX: number
  offsetY: number
}

/**
 * Letter chip for comment mode. Its center sits on the top-left corner so the
 * chip overlaps the box, and it stays inside the padding so it misses the text.
 * Longer labels shift slightly outward when they would otherwise reach a glyph.
 */
export function commentLabelBadgeLayout(
  label: string,
  scale = 1,
): CommentLabelBadgeLayout {
  const radius = (label.length === 1 ? 3.5 : 4.25) * scale
  const fontSize = radius * (label.length === 1 ? 1.25 : 0.9)
  const padding = COMMENT_PADDING * scale
  const clearance = 0.75 * scale
  const reach = padding * Math.SQRT2
  const needed = radius + clearance
  const outward = needed > reach ? needed / Math.SQRT2 - padding : 0
  return {
    radius,
    fontSize,
    offsetX: -outward,
    offsetY: -outward,
  }
}

const FONT_FAMILY = 'system-ui, "Segoe UI", Roboto, sans-serif'

let measureCanvas: HTMLCanvasElement | null = null
let measureContext: CanvasRenderingContext2D | null = null

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext) return measureContext
  measureCanvas = document.createElement('canvas')
  measureContext = measureCanvas.getContext('2d')
  return measureContext
}

export function getCommentBoxWidth(width?: number): number {
  if (width === undefined) return COMMENT_MAX_TEXT_WIDTH
  return clampCommentBoxWidth(width)
}

export function clampCommentBoxWidth(width: number): number {
  return Math.min(
    MAX_COMMENT_BOX_WIDTH,
    Math.max(MIN_COMMENT_BOX_WIDTH, width),
  )
}

/** Map-local x of the box right edge → unscaled inner text wrap width. */
export function textWidthFromRightEdge(
  localRightEdgeX: number,
  textScale = 1,
): number {
  const scale = textScale > 0 ? textScale : 1
  return clampCommentBoxWidth((localRightEdgeX * 2) / scale - COMMENT_PADDING * 2)
}

/** Unscaled inner text wrap width → map-local x of the box right edge. */
export function rightEdgeFromTextWidth(
  textWidth: number,
  textScale = 1,
): number {
  const scale = textScale > 0 ? textScale : 1
  return ((clampCommentBoxWidth(textWidth) + COMMENT_PADDING * 2) / 2) * scale
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = words[0]
    for (const word of words.slice(1)) {
      if (ctx.measureText(`${line} ${word}`).width <= maxWidth) {
        line = `${line} ${word}`
      } else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

export interface CommentBoxMetrics {
  width: number
  height: number
  lineText: string
  maxTextWidth: number
}

interface MeasureCommentBoxOptions {
  /** When false, the box keeps the full maxTextWidth even if the text is shorter. */
  shrinkToContent?: boolean
}

/** Measures a compact comment bubble for Konva map markers. */
export function measureCommentBox(
  text: string,
  maxTextWidth = COMMENT_MAX_TEXT_WIDTH,
  fontSize = COMMENT_FONT_SIZE,
  padding = COMMENT_PADDING,
  options: MeasureCommentBoxOptions = {},
): CommentBoxMetrics {
  const shrinkToContent = options.shrinkToContent ?? true
  const ctx = getMeasureContext()
  if (!ctx) {
    const fallbackHeight = fontSize * COMMENT_LINE_HEIGHT + padding * 2
    return {
      width: maxTextWidth + padding * 2,
      height: fallbackHeight,
      lineText: text,
      maxTextWidth,
    }
  }

  ctx.font = `500 ${fontSize}px ${FONT_FAMILY}`
  const lines = wrapText(ctx, text, maxTextWidth)
  const lineHeight = fontSize * COMMENT_LINE_HEIGHT
  const textHeight = Math.max(lines.length, 1) * lineHeight
  const textWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width),
    0,
  )

  const contentWidth = shrinkToContent
    ? Math.ceil(Math.min(maxTextWidth, textWidth))
    : Math.ceil(maxTextWidth)

  return {
    width: contentWidth + padding * 2,
    height: Math.ceil(textHeight) + padding * 2,
    lineText: lines.join('\n'),
    maxTextWidth,
  }
}
