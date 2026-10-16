import type { ProjectData } from '../store'
import { t } from '../i18n'

export const PROJECT_FORMAT = 'map-analysis'
export const PROJECT_VERSION = 1

export interface ProjectFile extends ProjectData {
  format: typeof PROJECT_FORMAT
  version: typeof PROJECT_VERSION
  /** Project name; omitted in files saved before named projects */
  name?: string
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
    throw new Error(t('error.invalidEntry', { label }))
  }
  const badIndex = items.findIndex((item) => !isValid(item))
  if (badIndex !== -1) {
    throw new Error(
      t('error.damagedEntry', { label, index: badIndex + 1 }),
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
    throw new Error(t('error.notJson'))
  }

  if (raw.format !== PROJECT_FORMAT) {
    throw new Error(t('error.notOurs'))
  }
  if (raw.version !== PROJECT_VERSION) {
    throw new Error(t('error.version', { version: String(raw.version) }))
  }
  if (raw.mapImage !== null && !isValidMapImage(raw.mapImage)) {
    throw new Error(t('error.invalidMap'))
  }
  if (raw.name !== undefined && typeof raw.name !== 'string') {
    throw new Error(t('error.invalidName'))
  }
  if (raw.rotation !== undefined && !isFiniteNumber(raw.rotation)) {
    throw new Error(t('error.invalidRotation'))
  }
  assertItems(t('error.labelTracks'), raw.tracks, isValidTrack)
  assertItems(t('error.labelDrawings'), raw.paths, isValidPath)
  assertItems(t('error.labelAnnotations'), raw.annotations, isValidAnnotation)

  return raw as unknown as ProjectFile
}
