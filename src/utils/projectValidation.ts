import type { ProjectData } from '../store'

export const PROJECT_FORMAT = 'map-analysis'
export const PROJECT_VERSION = 1

export interface ProjectFile extends ProjectData {
  format: typeof PROJECT_FORMAT
  version: typeof PROJECT_VERSION
}

type Rec = Record<string, unknown>

const isRecord = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

const isPoint = (v: unknown): boolean =>
  isRecord(v) && isFiniteNumber(v.x) && isFiniteNumber(v.y)

/** Flattened [x, y, ...] coordinates: finite numbers, whole pairs. */
const isFlatPoints = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length % 2 === 0 && v.every(isFiniteNumber)

/** Throws with a message naming the first entry that does not match the expected shape. */
function assertItems(
  label: string,
  items: unknown,
  isValid: (item: unknown) => boolean,
): void {
  if (!Array.isArray(items)) {
    throw new Error(`Invalid ${label} in project file`)
  }
  const badIndex = items.findIndex((item) => !isValid(item))
  if (badIndex !== -1) {
    throw new Error(
      `Invalid ${label} in project file (entry ${badIndex + 1} is damaged)`,
    )
  }
}

function isValidMapImage(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.src === 'string' &&
    isFiniteNumber(v.width) &&
    v.width > 0 &&
    isFiniteNumber(v.height) &&
    v.height > 0 &&
    typeof v.name === 'string'
  )
}

function isValidTrack(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    isFlatPoints(v.points) &&
    Array.isArray(v.anchors) &&
    v.anchors.every(
      (a) => isRecord(a) && isPoint(a.source) && isPoint(a.target),
    ) &&
    typeof v.color === 'string' &&
    isFiniteNumber(v.opacity)
  )
}

function isValidPath(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    isFlatPoints(v.points) &&
    isFiniteNumber(v.width) &&
    typeof v.color === 'string' &&
    isFiniteNumber(v.opacity)
  )
}

function isValidAnnotation(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    isPoint(v.position) &&
    typeof v.comment === 'string' &&
    isFiniteNumber(v.size) &&
    typeof v.color === 'string'
  )
}

export function validateProjectFile(raw: unknown): ProjectFile {
  if (!isRecord(raw)) {
    throw new Error('Project file is not valid JSON')
  }

  if (raw.format !== PROJECT_FORMAT) {
    throw new Error('Not an O-Analysis project file')
  }
  if (raw.version !== PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${String(raw.version)}`)
  }
  if (raw.mapImage !== null && !isValidMapImage(raw.mapImage)) {
    throw new Error('Invalid map image in project file')
  }
  if (raw.rotation !== undefined && !isFiniteNumber(raw.rotation)) {
    throw new Error('Invalid rotation in project file')
  }
  assertItems('GPX tracks', raw.tracks, isValidTrack)
  assertItems('drawings', raw.paths, isValidPath)
  assertItems('annotations', raw.annotations, isValidAnnotation)

  return raw as unknown as ProjectFile
}
