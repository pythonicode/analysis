import { stageRef } from '../stageRef'
import { useAppStore } from '../store'
import { markerLabel } from './labels'
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

function drawSidebar(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  x: number,
  width: number,
  height: number,
): void {
  const pad = width * 0.07
  const fontSize = Math.max(13, Math.min(width * 0.055, 42))
  const lineHeight = fontSize * 1.35
  const chipRadius = fontSize * 0.75
  const font = 'system-ui, "Segoe UI", Roboto, sans-serif'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, 0, width, height)
  ctx.strokeStyle = '#d4d4d8'
  ctx.lineWidth = Math.max(1, height * 0.001)
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, height)
  ctx.stroke()

  let y = pad + fontSize
  ctx.fillStyle = '#18181b'
  ctx.font = `600 ${fontSize * 1.15}px ${font}`
  ctx.fillText('Annotations', x + pad, y)
  y += lineHeight * 1.4

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i]
    const label = markerLabel(i)
    const textX = x + pad + chipRadius * 2 + fontSize * 0.6
    const textWidth = x + width - pad - textX

    ctx.font = `${fontSize}px ${font}`
    const lines = wrapText(
      ctx,
      annotation.comment || '(no comment)',
      textWidth,
    )
    const entryHeight = Math.max(lines.length * lineHeight, chipRadius * 2)

    if (y + entryHeight > height - pad) {
      ctx.fillStyle = '#71717a'
      ctx.font = `italic ${fontSize * 0.9}px ${font}`
      ctx.fillText(`+ ${annotations.length - i} more…`, x + pad, y + fontSize)
      return
    }

    // Letter chip matching the on-map marker colour
    const chipY = y + chipRadius
    ctx.fillStyle = annotation.color
    ctx.beginPath()
    ctx.arc(x + pad + chipRadius, chipY, chipRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 ${chipRadius * (label.length > 1 ? 0.85 : 1.1)}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + pad + chipRadius, chipY)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = annotation.comment ? '#18181b' : '#71717a'
    ctx.font = `${fontSize}px ${font}`
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], textX, y + fontSize * 0.9 + l * lineHeight)
    }

    y += entryHeight + lineHeight * 0.8
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
): string {
  const prevWidth = stage.width()
  const prevHeight = stage.height()
  const prevScale = stage.scaleX()
  const prevX = stage.x()
  const prevY = stage.y()

  try {
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
  const { mapImage, annotations, setSelectedId, activeTool, setActiveTool } =
    useAppStore.getState()
  if (!stage || !mapImage) return

  // Hide selection highlights and GPX anchor pins before capturing
  setSelectedId(null)
  if (activeTool === 'gpx') setActiveTool('select')

  void (async () => {
    await waitForPaint()

    const mapDataUrl = captureMapAtNativeResolution(stage, mapImage)

    const sidebarWidth =
      annotations.length > 0
        ? Math.round(Math.min(Math.max(mapImage.width * 0.28, 320), 900))
        : 0

    const baseName = mapImage.name.replace(/\.[^.]+$/, '') || 'map'
    const anchor = document.createElement('a')

    if (sidebarWidth === 0) {
      anchor.href = mapDataUrl
      anchor.download = `${baseName}-analysis.png`
      anchor.click()
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = mapImage.width + sidebarWidth
    canvas.height = mapImage.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapRender = await loadImage(mapDataUrl)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(mapRender, 0, 0)

    drawSidebar(ctx, annotations, mapImage.width, sidebarWidth, mapImage.height)

    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `${baseName}-analysis.png`
    anchor.click()
  })()
}
