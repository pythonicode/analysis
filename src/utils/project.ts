import { useAppStore, type ProjectData } from '../store'
import { AnalyticsEvents, trackEvent } from '../analytics'
import { importProject } from '../projectLibrary'
import { t } from '../i18n'
import { PROJECT_FORMAT, PROJECT_VERSION, validateProjectFile, type ProjectFile } from './projectValidation'

export const PROJECT_FILE_EXTENSION = '.anal'

export function hasProjectContent(data: ProjectData): boolean {
  return (
    data.mapImage !== null ||
    data.tracks.length > 0 ||
    data.paths.length > 0 ||
    data.annotations.length > 0
  )
}

export function isProjectFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)
}

/** Downloads the current project as a .anal file, named after the project. */
export function saveProjectFile(): void {
  const { mapImage, tracks, paths, annotations, projectName, setImportError } =
    useAppStore.getState()

  const project: ProjectData = {
    mapImage,
    tracks,
    paths,
    annotations,
    rotation: useAppStore.getState().viewport.rotation,
  }
  if (!hasProjectContent(project)) {
    setImportError(t('error.nothingToSave'))
    return
  }

  setImportError(null)

  const file: ProjectFile = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    name: projectName,
    ...project,
  }

  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const baseName = projectName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'project'
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

/** Adds the bundled sample project to the library and opens it. */
export async function openSampleProject(): Promise<void> {
  const { setImportError } = useAppStore.getState()
  setImportError(null)

  try {
    const response = await fetch('/sample.anal')
    if (!response.ok) {
      throw new Error(t('error.sampleNotFound'))
    }
    const parsed = validateProjectFile(JSON.parse(await response.text()))
    await importProject(parsed, parsed.name)
    trackEvent(AnalyticsEvents.OPEN_SAMPLE_PROJECT)
  } catch (error) {
    setImportError(
      error instanceof Error ? error.message : t('error.loadSample'),
    )
  }
}

/** Adds a .anal file to the library as a new project and opens it. */
export async function openProjectFile(
  file: File,
  source: 'file_picker' | 'drop' = 'file_picker',
): Promise<void> {
  const { setImportError } = useAppStore.getState()
  setImportError(null)

  if (!isProjectFile(file)) {
    setImportError(t('error.notProjectFile', { ext: PROJECT_FILE_EXTENSION }))
    return
  }

  try {
    const parsed = validateProjectFile(JSON.parse(await file.text()))
    await importProject(parsed, parsed.name)
    const { mapImage, tracks, annotations } = useAppStore.getState()
    trackEvent(AnalyticsEvents.OPEN_PROJECT, {
      source,
      has_map: mapImage !== null,
      track_count: tracks.length,
      annotation_count: annotations.length,
    })
  } catch (error) {
    setImportError(
      error instanceof Error ? error.message : t('error.openProject'),
    )
  }
}
