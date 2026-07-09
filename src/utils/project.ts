import { useAppStore, type ProjectData } from '../store'
import { AnalyticsEvents, trackEvent } from '../analytics'

const PROJECT_FORMAT = 'map-analysis'
const PROJECT_VERSION = 1
export const PROJECT_FILE_EXTENSION = '.anal'

interface ProjectFile extends ProjectData {
  format: typeof PROJECT_FORMAT
  version: typeof PROJECT_VERSION
}

function hasProjectContent(data: ProjectData): boolean {
  return (
    data.mapImage !== null ||
    data.tracks.length > 0 ||
    data.paths.length > 0 ||
    data.annotations.length > 0
  )
}

function validateProjectFile(raw: unknown): ProjectFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Project file is not valid JSON')
  }

  const data = raw as Record<string, unknown>

  if (data.format !== PROJECT_FORMAT) {
    throw new Error('Not an O-Analysis project file')
  }
  if (data.version !== PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${String(data.version)}`)
  }
  if (data.mapImage !== null && typeof data.mapImage !== 'object') {
    throw new Error('Invalid map image in project file')
  }
  if (!Array.isArray(data.tracks)) {
    throw new Error('Invalid GPX tracks in project file')
  }
  if (!Array.isArray(data.paths)) {
    throw new Error('Invalid drawings in project file')
  }
  if (!Array.isArray(data.annotations)) {
    throw new Error('Invalid annotations in project file')
  }

  return data as unknown as ProjectFile
}

export function isProjectFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)
}

/** Downloads the current project as a .anal file. */
export function saveProjectFile(): void {
  const { mapImage, tracks, paths, annotations, setImportError } =
    useAppStore.getState()

  const project: ProjectData = { mapImage, tracks, paths, annotations }
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
