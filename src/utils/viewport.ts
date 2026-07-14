import type { Point, Viewport } from '../types'

export const MIN_SCALE = 0.05
export const MAX_SCALE = 8

/** Minimum screen-pixel size before Konva shadow caching can round to 0×0. */
export const MIN_SHADOW_SCREEN_PX = 3

export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0
  const rounded = Math.round(degrees)
  return ((rounded % 360) + 360) % 360
}

/** Clamps a signed rotation slider value to whole degrees in [-360, 360]. */
export function clampRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0
  const rounded = Math.round(degrees)
  return Math.min(360, Math.max(-360, rounded))
}

/** Axis-aligned bounds of a width×height rectangle rotated by whole degrees. */
export function rotatedBounds(
  width: number,
  height: number,
  rotationDeg: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 }
  const normalized = normalizeRotation(rotationDeg)
  if (normalized === 0 || normalized === 180) {
    return { width, height }
  }
  if (normalized === 90 || normalized === 270) {
    return { width: height, height: width }
  }

  const rad = (normalized * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

/** Map-local point to layer-local coordinates after map-center rotation. */
export function mapToLayerLocal(
  point: Point,
  center: Point,
  rotationDeg: number,
): Point {
  const normalized = normalizeRotation(rotationDeg)
  if (normalized === 0) return point

  const rad = (normalized * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

/** Layer-local point back to map-local coordinates (inverse of mapToLayerLocal). */
export function layerToMapLocal(
  point: Point,
  center: Point,
  rotationDeg: number,
): Point {
  const normalized = normalizeRotation(rotationDeg)
  if (normalized === 0) return point

  const rad = (normalized * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos + dy * sin,
    y: center.y - dx * sin + dy * cos,
  }
}

/**
 * Applies a new rotation while keeping the map point at screenCenter fixed on screen.
 * Same anchor pattern as zoom-to-cursor and center-on-annotation.
 */
export function rotateViewportKeepingCenter(
  viewport: Viewport,
  newRotation: number,
  mapCenter: Point,
  screenCenter: Point,
): Viewport {
  const layerPoint = {
    x: (screenCenter.x - viewport.x) / viewport.scale,
    y: (screenCenter.y - viewport.y) / viewport.scale,
  }
  const mapPoint = layerToMapLocal(layerPoint, mapCenter, viewport.rotation)
  const newLayerPoint = mapToLayerLocal(mapPoint, mapCenter, newRotation)
  return clampViewport({
    scale: viewport.scale,
    rotation: newRotation,
    x: screenCenter.x - newLayerPoint.x * viewport.scale,
    y: screenCenter.y - newLayerPoint.y * viewport.scale,
  })
}

export function clampViewport(viewport: Viewport): Viewport {
  const scale = Number.isFinite(viewport.scale)
    ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale))
    : 1
  return {
    scale,
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    rotation: clampRotation(viewport.rotation ?? 0),
  }
}

export const DEFAULT_VIEWPORT: Viewport = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
}

/** True when a map-local dimension is large enough to safely use Konva shadows. */
export function canUseShadow(mapSize: number, viewportScale: number): boolean {
  return mapSize * viewportScale >= MIN_SHADOW_SCREEN_PX
}
