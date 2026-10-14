import { useAppStore, type ProjectData } from '../store'
import { AnalyticsEvents, trackEvent } from '../analytics'
import type { PendingProjectOpen } from '../types'

const PROJECT_FORMAT = 'map-analysis'
const PROJECT_VERSION = 1
export const PROJECT_FILE_EXTENSION = '.anal'

interface ProjectFile extends ProjectData {
  format: typeof PROJECT_FORMAT
  version: typeof PROJECT_VERSION
}

export function hasProjectContent(data: ProjectData): boolean {
  return (
    data.mapImage !== null ||
    data.tracks.length > 0 ||
    data.paths.length > 0 ||
    data.annotations.length > 0
  )
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

function validateProjectFile(raw: unknown): ProjectFile {
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

/** True when opening a project would discard content that is currently on screen. */
export function currentProjectHasContent(): boolean {
  const { mapImage, tracks, paths, annotations } = useAppStore.getState()
  return hasProjectContent({ mapImage, tracks, paths, annotations })
}

/**
 * Entry point for every project open (picker, drop, sample). Opens right away
 * when there is nothing to lose; otherwise parks the request until the user
 * confirms in ReplaceProjectModal.
 */
export function requestOpenProject(request: PendingProjectOpen): Promise<void> {
  if (currentProjectHasContent()) {
    useAppStore.getState().setPendingProjectOpen(request)
    return Promise.resolve()
  }
  return runProjectOpen(request)
}

/** Performs a project open that has already been confirmed (or needs no confirmation). */
export function runProjectOpen(request: PendingProjectOpen): Promise<void> {
  if (request.kind === 'sample') return openSampleProject()
  return openProjectFile(request.file, request.source)
}

export function isProjectFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)
}

/** Downloads the current project as a .anal file. */
export function saveProjectFile(): void {
  const { mapImage, tracks, paths, annotations, setImportError } =
    useAppStore.getState()

  const project: ProjectData = {
    mapImage,
    tracks,
    paths,
    annotations,
    rotation: useAppStore.getState().viewport.rotation,
  }
  if (!hasProjectContent(project)) {
    setImportError('Nothing to save — import a map or add content first')
    return
  }

  setImportError(null)

  const file: ProjectFile = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    ...project,
  }

  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const baseName = mapImage?.name.replace(/\.[^.]+$/, '') || 'project'
  anchor.href = url
  anchor.download = `${baseName}${PROJECT_FILE_EXTENSION}`
  anchor.click()
  URL.revokeObjectURL(url)

  trackEvent(AnalyticsEvents.SAVE_PROJECT, {
    has_map: mapImage !== null,
    track_count: tracks.length,
    annotation_count: annotations.length,
  })
}

/** Loads project data parsed from JSON text. */
function loadProjectFromText(text: string): void {
  const { loadProject } = useAppStore.getState()
  const parsed = validateProjectFile(JSON.parse(text))
  loadProject({
    mapImage: parsed.mapImage,
    tracks: parsed.tracks,
    paths: parsed.paths,
    annotations: parsed.annotations,
    rotation: parsed.rotation,
  })
}

/** Loads the bundled sample project from /public/sample.anal. */
export async function openSampleProject(): Promise<void> {
  const { setImportError } = useAppStore.getState()
  setImportError(null)

  try {
    const response = await fetch('/sample.anal')
    if (!response.ok) {
      throw new Error('Sample project not found')
    }
    loadProjectFromText(await response.text())
    trackEvent(AnalyticsEvents.OPEN_SAMPLE_PROJECT)
  } catch (error) {
    setImportError(
      error instanceof Error ? error.message : 'Failed to load sample project',
    )
  }
}

/** Loads a project from a .anal file. */
export async function openProjectFile(
  file: File,
  source: 'file_picker' | 'drop' = 'file_picker',
): Promise<void> {
  const { setImportError } = useAppStore.getState()
  setImportError(null)

  if (!isProjectFile(file)) {
    setImportError(`Not a project file — expected ${PROJECT_FILE_EXTENSION}`)
    return
  }

  try {
    loadProjectFromText(await file.text())
    const { mapImage, tracks, annotations } = useAppStore.getState()
    trackEvent(AnalyticsEvents.OPEN_PROJECT, {
      source,
      has_map: mapImage !== null,
      track_count: tracks.length,
      annotation_count: annotations.length,
    })
  } catch (error) {
    setImportError(
      error instanceof Error ? error.message : 'Failed to open project file',
    )
  }
}
