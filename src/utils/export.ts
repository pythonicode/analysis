import { stageRef } from '../stageRef'
import { contentGroupRef } from '../contentGroupRef'
import { useAppStore } from '../store'
import { AnalyticsEvents, trackEvent } from '../analytics'
import { markerLabel } from './labels'
import { drawMapMarkers } from './exportMarkers'
import type { Annotation } from '../types'

export interface ExportOptions {
  includeSidebar: boolean
  /** Multiplier for comment / sidebar body text (0.5–2) */
  textScale: number
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeSidebar: true,
  textScale: 1,
}

let markersSuppressed = false

/** When true, MarkersLayer skips rendering so export can composite markers separately. */
export function areExportMarkersSuppressed(): boolean {
  return markersSuppressed
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to render export image'))
    img.src = src
  })
}

export interface ExportPreviewImages {
  full: { url: string; width: number; height: number }
  thumb: { url: string; width: number; height: number }
}

/** Downscaled copy for the fit-to-view preview; full export resolution kept for zoom. */
export async function createPreviewThumbnail(
  dataUrl: string,
  maxDimension: number,
): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  if (scale >= 1) {
    return { url: dataUrl, width: img.width, height: img.height }
  }

  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { url: dataUrl, width: img.width, height: img.height }
  }

  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, 0, 0, width, height)
  return { url: canvas.toDataURL('image/png'), width, height }
}

const PREVIEW_THUMB_MAX_PX = 1600

/** Renders full export PNG plus a thumbnail sized for the modal preview. */
export async function renderExportPreviews(
  options: ExportOptions,
): Promise<ExportPreviewImages | null> {
  const url = await renderExportDataUrl(options)
  if (!url) return null

  const img = await loadImage(url)
  const full = { url, width: img.width, height: img.height }
  const thumb = await createPreviewThumbnail(url, PREVIEW_THUMB_MAX_PX)
  return { full, thumb }
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
  textScale: number,
): SidebarLayout {
  const pad = columnWidth * 0.07
  const fontSize = Math.max(10, Math.min(columnWidth * 0.042, 28)) * textScale
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
 * downscaled through the on-screen viewport transform. View rotation is
 * ignored, matching how zoom/pan are editing-only controls.
 */
function captureMapAtNativeResolution(
  stage: NonNullable<typeof stageRef.current>,
  mapImage: { width: number; height: number },
): string {
  const prevWidth = stage.width()
  const prevHeight = stage.height()
  const prevScale = stage.scaleX()
  const prevX = stage.x()
  const prevY = stage.y()
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
      group.rotation(0)
      group.offset({ x: centerX, y: centerY })
      group.position({ x: centerX, y: centerY })
    }

    stage.width(mapImage.width)
    stage.height(mapImage.height)
    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })
    stage.draw()

    return stage.toDataURL({
      x: 0,
      y: 0,
      width: mapImage.width,
      height: mapImage.height,
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

async function captureBaseMap(): Promise<string | null> {
  const stage = stageRef.current
  const { mapImage, setSelectedId, activeTool, setActiveTool } =
    useAppStore.getState()
  if (!stage || !mapImage) return null

  setSelectedId(null)
  if (activeTool === 'gpx') setActiveTool('select')

  markersSuppressed = true
  await waitForPaint()

  try {
    return captureMapAtNativeResolution(stage, mapImage)
  } finally {
    markersSuppressed = false
    await waitForPaint()
  }
}

/**
 * Renders the full export composite at native map resolution.
 * Returns a PNG data URL or null when no map is loaded.
 */
export async function renderExportDataUrl(
  options: ExportOptions,
): Promise<string | null> {
  const { mapImage, annotations, markerDisplayMode } = useAppStore.getState()
  if (!mapImage) return null

  const mapDataUrl = await captureBaseMap()
  if (!mapDataUrl) return null

  const useSidebar =
    options.includeSidebar && annotations.length > 0
  const columnWidth = useSidebar ? columnWidthForMap(mapImage.width) : 0

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  if (!useSidebar) {
    canvas.width = mapImage.width
    canvas.height = mapImage.height
    const mapRender = await loadImage(mapDataUrl)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(mapRender, 0, 0)
    drawMapMarkers(ctx, annotations, markerDisplayMode, options.textScale)
    return canvas.toDataURL('image/png')
  }

  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) return null

  const layout = layoutSidebar(
    measureCtx,
    annotations,
    columnWidth,
    mapImage.height,
    options.textScale,
  )
  const sidebarWidth = columnWidth * layout.columns.length

  canvas.width = mapImage.width + sidebarWidth
  canvas.height = mapImage.height

  const mapRender = await loadImage(mapDataUrl)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(mapRender, 0, 0)
  drawMapMarkers(ctx, annotations, markerDisplayMode, options.textScale)
  drawSidebar(ctx, layout, mapImage.width, mapImage.height)

  return canvas.toDataURL('image/png')
}

/** Downloads the export PNG with the given options. */
export async function downloadExport(options: ExportOptions): Promise<void> {
  const { mapImage, annotations } = useAppStore.getState()
  if (!mapImage) return

  const dataUrl = await renderExportDataUrl(options)
  if (!dataUrl) return

  const baseName = mapImage.name.replace(/\.[^.]+$/, '') || 'map'
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = `${baseName}-analysis.png`
  anchor.click()

  trackEvent(AnalyticsEvents.EXPORT_PNG, {
    annotation_count: annotations.length,
    has_sidebar: options.includeSidebar && annotations.length > 0,
    text_scale: options.textScale,
  })
}

/** @deprecated Use downloadExport via ExportModal */
export function exportPng(): void {
  void downloadExport(DEFAULT_EXPORT_OPTIONS)
}

export function defaultIncludeSidebar(
  markerDisplayMode: 'labels' | 'comments',
  annotationCount: number,
): boolean {
  return annotationCount > 0 && markerDisplayMode === 'labels'
}
