import type { GpxTrack } from '../types'
import { cumulativeDistancesFromLatLon } from './gpxMetrics'

interface ParsedGpx {
  name: string
  /** Flattened [x1, y1, ...] points in track-local coordinates, bbox anchored at (0,0) */
  points: number[]
  /** Bounding box size of the local points */
  width: number
  height: number
  /** Epoch ms per vertex when GPX includes timestamps */
  vertexTimes?: number[]
  /** Cumulative geodesic distance in meters per vertex */
  vertexDistances: number[]
}

/** Web Mercator projection; y is flipped so north is up in canvas coordinates. */
function project(lat: number, lon: number): { x: number; y: number } {
  const x = (lon * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  const y = -Math.log(Math.tan(Math.PI / 4 + latRad / 2))
  return { x, y }
}

function parseTimeMs(node: Element): number | undefined {
  const text = node.querySelector(':scope > time')?.textContent?.trim()
  if (!text) return undefined
  const ms = Date.parse(text)
  return Number.isFinite(ms) ? ms : undefined
}

/**
 * Parses a GPX document into a single polyline in local coordinates.
 * Uses track points, falling back to route points, then waypoints.
 */
export function parseGpx(xml: string, fileName: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Not a valid GPX file')
  }

  let pointNodes = Array.from(doc.querySelectorAll('trkpt'))
  if (pointNodes.length === 0) pointNodes = Array.from(doc.querySelectorAll('rtept'))
  if (pointNodes.length === 0) pointNodes = Array.from(doc.querySelectorAll('wpt'))

  const coords: { lat: number; lon: number }[] = []
  const times: (number | undefined)[] = []
  const projected: { x: number; y: number }[] = []

  for (const node of pointNodes) {
    const lat = Number(node.getAttribute('lat'))
    const lon = Number(node.getAttribute('lon'))
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      coords.push({ lat, lon })
      times.push(parseTimeMs(node))
      projected.push(project(lat, lon))
    }
  }

  if (projected.length < 2) {
    throw new Error('GPX file contains no usable track points')
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of projected) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  const width = maxX - minX || 1e-9
  const height = maxY - minY || 1e-9

  const name =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    fileName.replace(/\.gpx$/i, '')

  const points: number[] = []
  for (const p of projected) {
    points.push(p.x - minX, p.y - minY)
  }

  const vertexDistances = cumulativeDistancesFromLatLon(coords)
  const hasAnyTime = times.some((t) => t != null)
  const vertexTimes = hasAnyTime
    ? times.map((t, i) => t ?? times[i - 1] ?? times[i + 1] ?? 0)
    : undefined

  return { name, points, width, height, vertexTimes, vertexDistances }
}

export const TRACK_COLORS = [
  '#2563eb',
  '#e11d48',
  '#16a34a',
  '#f59e0b',
  '#9333ea',
]

/** Default GPX stroke width scaled to the map size. */
export function defaultGpxStrokeWidth(target: {
  width: number
  height: number
}): number {
  const baseDim = Math.max(target.width, target.height)
  return Math.max(3, baseDim * 0.003)
}

export function resolveGpxStrokeWidth(
  track: GpxTrack,
  mapImage: { width: number; height: number } | null,
): number {
  if (track.width != null && track.width > 0) return track.width
  const target = mapImage ?? { width: 1000, height: 1000 }
  return defaultGpxStrokeWidth(target)
}

/**
 * Builds a GpxTrack with the initial fit baked into the points: scaled so the
 * bounding box fits ~80% of the target area and centered. Anchors start empty;
 * the user georeferences the track by pinning points in adjust mode.
 */
export function buildTrack(
  parsed: ParsedGpx,
  target: { width: number; height: number },
  index: number,
): GpxTrack {
  const fit =
    Math.min(target.width / parsed.width, target.height / parsed.height) * 0.8
  const offsetX = (target.width - parsed.width * fit) / 2
  const offsetY = (target.height - parsed.height * fit) / 2
  const points = parsed.points.map((v, i) =>
    i % 2 === 0 ? v * fit + offsetX : v * fit + offsetY,
  )

  return {
    id: crypto.randomUUID(),
    name: parsed.name,
    points,
    anchors: [],
    color: TRACK_COLORS[index % TRACK_COLORS.length],
    opacity: 0.85,
    width: defaultGpxStrokeWidth(target),
    vertexTimes: parsed.vertexTimes,
    vertexDistances: parsed.vertexDistances,
  }
}
