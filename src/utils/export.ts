import { stageRef } from '../stageRef'
import { contentGroupRef } from '../contentGroupRef'
import { useAppStore } from '../store'
import { AnalyticsEvents, trackEvent } from '../analytics'
import { markerLabel } from './labels'
import { rotatedBounds } from './viewport'
import type { Annotation } from '../types'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to render export image'))
    img.src = src
  })
}

/** Splits text into lines that fit maxWidth, honouring explicit newlines. */
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

interface SidebarEntry {
  annotation: Annotation
  index: number
  lines: string[]
  entryHeight: number
}

interface SidebarLayout {
  columnWidth: number
  columns: SidebarEntry[][]
  fontSize: number
  lineHeight: number
  chipRadius: number
  pad: number
}

function columnWidthForMap(mapWidth: number): number {
  return Math.round(Math.min(Math.max(mapWidth * 0.28, 320), 900))
}

/** Computes multi-column layout so every annotation fits without truncation. */
function layoutSidebar(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  columnWidth: number,
  height: number,
): SidebarLayout {
  const pad = columnWidth * 0.07
  const fontSize = Math.max(10, Math.min(columnWidth * 0.042, 28))
  const lineHeight = fontSize * 1.3
  const chipRadius = fontSize * 0.7
  const font = 'system-ui, "Segoe UI", Roboto, sans-serif'
  const headerHeight = pad + fontSize + lineHeight * 1.4
  const entryGap = lineHeight * 0.65
  const textXOffset = pad + chipRadius * 2 + fontSize * 0.5
  const textWidth = columnWidth - pad - textXOffset

  const columns: SidebarEntry[][] = [[]]
  let col = 0
  let y = headerHeight

  ctx.font = `${fontSize}px ${font}`

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i]
    const lines = wrapText(
      ctx,
      annotation.comment || '(no comment)',
      textWidth,
    )
    const entryHeight = Math.max(lines.length * lineHeight, chipRadius * 2)

    if (y + entryHeight > height - pad) {
      col++
      columns[col] = []
      y = pad
    }

    columns[col].push({ annotation, index: i, lines, entryHeight })
    y += entryHeight + entryGap
  }

  return { columnWidth, columns, fontSize, lineHeight, chipRadius, pad }
}

function drawSidebar(
  ctx: CanvasRenderingContext2D,
  layout: SidebarLayout,
  x: number,
  height: number,
): void {
  const { columnWidth, columns, fontSize, lineHeight, chipRadius, pad } = layout
  const font = 'system-ui, "Segoe UI", Roboto, sans-serif'
  const headerHeight = pad + fontSize + lineHeight * 1.4
  const entryGap = lineHeight * 0.65
  const totalWidth = columnWidth * columns.length

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, 0, totalWidth, height)
  ctx.strokeStyle = '#d4d4d8'
  ctx.lineWidth = Math.max(1, height * 0.001)
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, height)
  ctx.stroke()

  for (let c = 0; c < columns.length; c++) {
    const colX = x + c * columnWidth
    let y = c === 0 ? headerHeight : pad

    if (c === 0) {
      ctx.fillStyle = '#18181b'
      ctx.font = `600 ${fontSize * 1.1}px ${font}`
      ctx.fillText('Annotations', colX + pad, pad + fontSize)
    }

    if (c > 0) {
      ctx.strokeStyle = '#e4e4e7'
      ctx.beginPath()
      ctx.moveTo(colX, 0)
      ctx.lineTo(colX, height)
      ctx.stroke()
    }

    const textX = colX + pad + chipRadius * 2 + fontSize * 0.5

    for (const entry of columns[c]) {
      const { annotation, index, lines, entryHeight } = entry
      const label = markerLabel(index)

      const chipY = y + chipRadius
      ctx.fillStyle = annotation.color
      ctx.beginPath()
      ctx.arc(colX + pad + chipRadius, chipY, chipRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 ${chipRadius * (label.length > 1 ? 0.85 : 1.1)}px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, colX + pad + chipRadius, chipY)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'

      ctx.fillStyle = annotation.comment ? '#18181b' : '#71717a'
      ctx.font = `${fontSize}px ${font}`
      for (let l = 0; l < lines.length; l++) {
        ctx.fillText(lines[l], textX, y + fontSize * 0.85 + l * lineHeight)
      }

      y += entryHeight + entryGap
    }
  }
}

/** Waits for React/Konva to finish painting after state changes. */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/**
 * Renders the stage at 1:1 map coordinates so the base image is not
 * downscaled through the on-screen viewport transform.
 */
function captureMapAtNativeResolution(
  stage: NonNullable<typeof stageRef.current>,
  mapImage: { width: number; height: number },
  rotation: number,
): string {
  const prevWidth = stage.width()
  const prevHeight = stage.height()
  const prevScale = stage.scaleX()
  const prevX = stage.x()
  const prevY = stage.y()
  const bounds = rotatedBounds(mapImage.width, mapImage.height, rotation)
  const centerX = mapImage.width / 2
  const centerY = mapImage.height / 2
  const group = contentGroupRef.current
  const prevGroupRotation = group?.rotation() ?? 0
  const prevGroupX = group?.x() ?? centerX
  const prevGroupY = group?.y() ?? centerY
  const prevGroupOffsetX = group?.offsetX() ?? centerX
  const prevGroupOffsetY = group?.offsetY() ?? centerY

  try {
    if (group) {
      group.rotation(rotation)
      group.offset({ x: centerX, y: centerY })
      group.position({ x: centerX, y: centerY })
    }

    stage.width(bounds.width)
    stage.height(bounds.height)
    stage.scale({ x: 1, y: 1 })
    stage.position({
      x: -centerX + bounds.width / 2,
      y: -centerY + bounds.height / 2,
    })
    stage.draw()

    return stage.toDataURL({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
      pixelRatio: 1,
      mimeType: 'image/png',
    })
  } finally {
    if (group) {
      group.rotation(prevGroupRotation)
      group.offset({ x: prevGroupOffsetX, y: prevGroupOffsetY })
      group.position({ x: prevGroupX, y: prevGroupY })
    }
    stage.width(prevWidth)
    stage.height(prevHeight)
    stage.scale({ x: prevScale, y: prevScale })
    stage.position({ x: prevX, y: prevY })
    stage.draw()
  }
}

/**
 * Exports the annotated map as a PNG at the map image's native resolution.
 * When annotations exist, an "Annotations" sidebar listing each marker's
 * letter and comment is appended to the right of the map.
 */
export function exportPng(): void {
  const stage = stageRef.current
  const { mapImage, annotations, setSelectedId, activeTool, setActiveTool, viewport } =
    useAppStore.getState()
  if (!stage || !mapImage) return

  // Hide selection highlights and GPX anchor pins before capturing
  setSelectedId(null)
  if (activeTool === 'gpx') setActiveTool('select')

  void (async () => {
    await waitForPaint()

    const mapDataUrl = captureMapAtNativeResolution(
      stage,
      mapImage,
      viewport.rotation,
    )

    const exportBounds = rotatedBounds(
      mapImage.width,
      mapImage.height,
      viewport.rotation,
    )

    const columnWidth =
      annotations.length > 0 ? columnWidthForMap(exportBounds.width) : 0

    const baseName = mapImage.name.replace(/\.[^.]+$/, '') || 'map'
    const anchor = document.createElement('a')

    if (columnWidth === 0) {
      anchor.href = mapDataUrl
      anchor.download = `${baseName}-analysis.png`
      anchor.click()
      trackEvent(AnalyticsEvents.EXPORT_PNG, {
        annotation_count: 0,
        has_sidebar: false,
      })
      return
    }

    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')
    if (!measureCtx) return

    const layout = layoutSidebar(
      measureCtx,
      annotations,
      columnWidth,
      exportBounds.height,
    )
    const sidebarWidth = columnWidth * layout.columns.length

    const canvas = document.createElement('canvas')
    canvas.width = exportBounds.width + sidebarWidth
    canvas.height = exportBounds.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapRender = await loadImage(mapDataUrl)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(mapRender, 0, 0)

    drawSidebar(ctx, layout, exportBounds.width, exportBounds.height)

    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `${baseName}-analysis.png`
    anchor.click()
    trackEvent(AnalyticsEvents.EXPORT_PNG, {
      annotation_count: annotations.length,
      has_sidebar: true,
    })
  })()
}
