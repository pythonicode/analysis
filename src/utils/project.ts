import { useAppStore, type ProjectData } from '../store'

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
    throw new Error('Not a Map Analysis project file')
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
}

/** Loads a project from a .anal file. */
export async function openProjectFile(file: File): Promise<void> {
  const { loadProject, setImportError } = useAppStore.getState()
  setImportError(null)

  if (!isProjectFile(file)) {
    setImportError(`Not a project file — expected ${PROJECT_FILE_EXTENSION}`)
    return
  }

  try {
    const text = await file.text()
    const parsed = validateProjectFile(JSON.parse(text))
    loadProject({
      mapImage: parsed.mapImage,
      tracks: parsed.tracks,
      paths: parsed.paths,
      annotations: parsed.annotations,
    })
  } catch (error) {
    setImportError(
      error instanceof Error ? error.message : 'Failed to open project file',
    )
  }
}
