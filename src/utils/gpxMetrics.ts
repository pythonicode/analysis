import type { GpxTrack } from '../types'

const EARTH_RADIUS_M = 6_371_000
const MAX_PACE_MIN_PER_KM = 20
const PACE_SMOOTH_WINDOW = 5
const HR_SMOOTH_WINDOW = 5
const HR_SCALE_FLOOR = 60
const HR_SCALE_CEILING = 220
const HR_MISSING_COLOR = '#9ca3af'

/** Great-circle distance between two WGS84 points in meters. */
export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

export interface PaceSample {
  /** Vertex index at the end of this segment (1..n-1) */
  vertexIndex: number
  /** Cumulative distance at this vertex in km */
  distanceKm: number
  /** Smoothed pace in min/km; null when timing unavailable */
  paceMinPerKm: number | null
}

export function hasTrackTiming(track: GpxTrack): boolean {
  const times = track.vertexTimes
  if (!times || times.length < 2) return false
  return times.some((t, i) => i > 0 && Number.isFinite(t) && t > times[i - 1]!)
}

export function hasTrackHeartRate(track: GpxTrack): boolean {
  const hrs = track.vertexHeartRates
  if (!hrs || hrs.length < 2) return false
  let count = 0
  for (const h of hrs) {
    if (Number.isFinite(h) && h > 0) {
      count++
      if (count >= 2) return true
    }
  }
  return false
}

/** Format pace as m:ss /km */
export function formatPace(minPerKm: number): string {
  const totalSec = Math.round(minPerKm * 60)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}

const PACE_SCALE_FLOOR = 2
const PACE_SCALE_CEILING = MAX_PACE_MIN_PER_KM
const PACE_MISSING_COLOR = '#9ca3af'

/**
 * Default green/red pace scale from the track’s smoothed pace series.
 * Falls back to a typical running range when timing is absent.
 */
export function defaultPaceScale(track: GpxTrack): { min: number; max: number } {
  const { samples, hasTiming } = computePaceSeries(track)
  if (!hasTiming) {
    return { min: 4, max: 8 }
  }
  const paces = samples
    .map((s) => s.paceMinPerKm)
    .filter((p): p is number => p != null && Number.isFinite(p))
  if (paces.length === 0) {
    return { min: 4, max: 8 }
  }
  const rawMin = Math.min(...paces)
  const rawMax = Math.max(...paces)
  let min = Math.max(PACE_SCALE_FLOOR, rawMin - 0.25)
  let max = Math.min(PACE_SCALE_CEILING, rawMax + 0.25)
  if (max - min < 0.5) {
    const mid = (min + max) / 2
    min = Math.max(PACE_SCALE_FLOOR, mid - 0.25)
    max = Math.min(PACE_SCALE_CEILING, mid + 0.25)
  }
  if (min >= max) {
    return { min: 4, max: 8 }
  }
  return { min, max }
}

/**
 * Map pace (min/km) onto green (fast) → red (slow). Null pace → gray.
 */
export function paceToColor(
  paceMinPerKm: number | null,
  scaleMin: number,
  scaleMax: number,
): string {
  if (paceMinPerKm == null || !Number.isFinite(paceMinPerKm)) {
    return PACE_MISSING_COLOR
  }
  const span = scaleMax - scaleMin
  const t =
    span <= 0
      ? 0.5
      : Math.min(1, Math.max(0, (paceMinPerKm - scaleMin) / span))
  // t=0 fast → green (120°); t=1 slow → red (0°)
  const hue = 120 * (1 - t)
  return `hsl(${hue} 72% 42%)`
}

/**
 * Default dark/bright red HR scale from the track’s smoothed HR series.
 * Falls back to a typical aerobic range when HR data is absent.
 */
export function defaultHrScale(track: GpxTrack): { min: number; max: number } {
  const { samples, hasHeartRate } = computeHrSeries(track)
  if (!hasHeartRate) {
    return { min: 120, max: 170 }
  }
  const rates = samples
    .map((s) => s.hrBpm)
    .filter((h): h is number => h != null && Number.isFinite(h) && h > 0)
  if (rates.length === 0) {
    return { min: 120, max: 170 }
  }
  const rawMin = Math.min(...rates)
  const rawMax = Math.max(...rates)
  let min = Math.max(HR_SCALE_FLOOR, Math.floor(rawMin - 2))
  let max = Math.min(HR_SCALE_CEILING, Math.ceil(rawMax + 2))
  if (max - min < 5) {
    const mid = (min + max) / 2
    min = Math.max(HR_SCALE_FLOOR, Math.floor(mid - 2.5))
    max = Math.min(HR_SCALE_CEILING, Math.ceil(mid + 2.5))
  }
  if (min >= max) {
    return { min: 120, max: 170 }
  }
  return { min, max }
}

/**
 * Map HR (bpm) onto dark red (low) → bright red (high). Null HR → gray.
 */
export function hrToColor(
  hrBpm: number | null,
  scaleMin: number,
  scaleMax: number,
): string {
  if (hrBpm == null || !Number.isFinite(hrBpm) || hrBpm <= 0) {
    return HR_MISSING_COLOR
  }
  const span = scaleMax - scaleMin
  const t =
    span <= 0
      ? 0.5
      : Math.min(1, Math.max(0, (hrBpm - scaleMin) / span))
  // dark red → light bright red
  const saturation = 75 + t * 20
  const lightness = 10 + t * 58
  return `hsl(0 ${saturation}% ${lightness}%)`
}

export interface HrSample {
  vertexIndex: number
  /** Smoothed heart rate in bpm; null when unavailable */
  hrBpm: number | null
}

/** One sample per vertex; HR at index i colors the segment ending at i. */
export function computeHrSeries(track: GpxTrack): {
  samples: HrSample[]
  hasHeartRate: boolean
} {
  const n = track.points.length / 2
  const hrs = track.vertexHeartRates
  const hasHeartRate = hasTrackHeartRate(track)

  const samples: HrSample[] = []
  for (let i = 0; i < n; i++) {
    samples.push({ vertexIndex: i, hrBpm: null })
  }

  if (!hasHeartRate || !hrs) {
    return { samples, hasHeartRate: false }
  }

  const raw: (number | null)[] = hrs.map((h) =>
    Number.isFinite(h) && h > 0 ? h : null,
  )
  const smoothed = movingAverage(raw, HR_SMOOTH_WINDOW)

  for (let i = 0; i < n; i++) {
    samples[i]!.hrBpm = smoothed[i] ?? null
  }

  return { samples, hasHeartRate: true }
}

function rawSegmentPace(
  times: number[],
  distances: number[],
  i: number,
): number | null {
  const dt = times[i]! - times[i - 1]!
  const dd = distances[i]! - distances[i - 1]!
  if (dt <= 0 || dd <= 0) return null
  const pace = dt / 60000 / (dd / 1000)
  return Math.min(pace, MAX_PACE_MIN_PER_KM)
}

function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2))
    const end = Math.min(values.length, i + Math.ceil(window / 2))
    let sum = 0
    let count = 0
    for (let j = start; j < end; j++) {
      const v = values[j]
      if (v != null) {
        sum += v
        count++
      }
    }
    out.push(count > 0 ? sum / count : null)
  }
  return out
}

/** One sample per vertex (index 0 is start; pace applies from index 1 onward). */
export function computePaceSeries(track: GpxTrack): {
  samples: PaceSample[]
  hasTiming: boolean
} {
  const n = track.points.length / 2
  const distances = track.vertexDistances
  const times = track.vertexTimes
  const hasTiming = hasTrackTiming(track)

  const samples: PaceSample[] = []
  for (let i = 0; i < n; i++) {
    const distanceKm =
      distances && distances[i] != null ? distances[i]! / 1000 : i / Math.max(1, n - 1)
    samples.push({
      vertexIndex: i,
      distanceKm,
      paceMinPerKm: null,
    })
  }

  if (!hasTiming || !times || !distances) {
    return { samples, hasTiming: false }
  }

  const rawPaces: (number | null)[] = [null]
  for (let i = 1; i < n; i++) {
    rawPaces.push(rawSegmentPace(times, distances, i))
  }
  const smoothed = movingAverage(rawPaces, PACE_SMOOTH_WINDOW)

  for (let i = 1; i < n; i++) {
    samples[i]!.paceMinPerKm = smoothed[i] ?? null
  }

  return { samples, hasTiming: true }
}

function anchorVertexIndex(track: GpxTrack, anchor: GpxTrack['anchors'][0]): number {
  const n = track.points.length / 2
  for (let i = 0; i < n; i++) {
    const x = track.points[i * 2]!
    const y = track.points[i * 2 + 1]!
    if (x === anchor.source.x && y === anchor.source.y) return i
  }
  return -1
}

export function cropTrack(
  track: GpxTrack,
  startIndex: number,
  endIndex: number,
): GpxTrack {
  const n = track.points.length / 2
  const start = Math.max(0, Math.min(startIndex, n - 2))
  const end = Math.max(start + 1, Math.min(endIndex, n - 1))

  const slicePoints: number[] = []
  for (let i = start; i <= end; i++) {
    slicePoints.push(track.points[i * 2]!, track.points[i * 2 + 1]!)
  }

  const sliceTimes = track.vertexTimes?.slice(start, end + 1)
  let sliceDistances = track.vertexDistances?.slice(start, end + 1)
  if (sliceDistances && sliceDistances.length > 0) {
    const base = sliceDistances[0] ?? 0
    sliceDistances = sliceDistances.map((d) => d - base)
  }
  const sliceHeartRates = track.vertexHeartRates?.slice(start, end + 1)

  const keptAnchors = track.anchors.filter((anchor) => {
    const idx = anchorVertexIndex(track, anchor)
    return idx >= start && idx <= end
  })

  return {
    ...track,
    points: slicePoints,
    vertexTimes: sliceTimes,
    vertexDistances: sliceDistances,
    vertexHeartRates: sliceHeartRates,
    anchors: keptAnchors,
  }
}

export function distanceAtVertex(track: GpxTrack, index: number): number {
  const distances = track.vertexDistances
  if (distances && distances[index] != null) return distances[index]! / 1000
  const n = track.points.length / 2
  const total = distances?.[n - 1] ?? 0
  if (total > 0) return (total / 1000) * (index / Math.max(1, n - 1))
  return index / Math.max(1, n - 1)
}

export function vertexCount(track: GpxTrack): number {
  return track.points.length / 2
}

/** Compute cumulative distances from lat/lon pairs (used during GPX parse). */
export function cumulativeDistancesFromLatLon(
  coords: { lat: number; lon: number }[],
): number[] {
  const out: number[] = [0]
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!
    const curr = coords[i]!
    const seg = haversineM(prev.lat, prev.lon, curr.lat, curr.lon)
    out.push(out[i - 1]! + seg)
  }
  return out
}
