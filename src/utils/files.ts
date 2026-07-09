import { useAppStore } from '../store'
import { AnalyticsEvents, trackEvent } from '../analytics'
import { buildTrack, parseGpx } from './gpx'
import { openProjectFile, isProjectFile } from './project'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

type ImportSource = 'file_picker' | 'drop'

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode the image file'))
    img.src = src
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.readAsDataURL(file)
  })
}

export async function importImageFile(
  file: File,
  source: ImportSource = 'file_picker',
): Promise<void> {
  const { mapImage, setMapImage, setImportError } = useAppStore.getState()
  const isReplace = mapImage !== null
  setImportError(null)

  if (!file.type.startsWith('image/')) {
    setImportError(`"${file.name}" is not an image file`)
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    setImportError(
      `Image is too large (${formatMb(file.size)}). Maximum size is 20MB.`,
    )
    return
  }

  try {
    // Data URL (not object URL) so the image survives persistence and project save
    const dataUrl = await readFileAsDataUrl(file)
    const img = await loadImageElement(dataUrl)
    setMapImage({
      src: dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      name: file.name,
    })
    trackEvent(AnalyticsEvents.IMPORT_IMAGE, {
      replace: isReplace,
      source,
    })
  } catch (error) {
    setImportError(error instanceof Error ? error.message : 'Image import failed')
  }
}

export async function importGpxFile(
  file: File,
  source: ImportSource = 'file_picker',
): Promise<void> {
  const store = useAppStore.getState()
  store.setImportError(null)

  try {
    const text = await file.text()
    const parsed = parseGpx(text, file.name)
    const { mapImage, tracks } = useAppStore.getState()
    // Fit within the map image if present, otherwise a nominal working area
    const target = mapImage ?? { width: 1000, height: 1000 }
    const track = buildTrack(parsed, target, tracks.length)
    useAppStore.getState().addTrack(track)
    // Drop straight into GPX adjustment mode so the user can pin the track
    useAppStore.getState().setActiveTool('gpx')
    trackEvent(AnalyticsEvents.IMPORT_GPX, {
      track_count: tracks.length + 1,
      source,
    })
  } catch (error) {
    store.setImportError(
      error instanceof Error ? error.message : 'GPX import failed',
    )
  }
}

/** Routes dropped files to the right importer based on type/extension. */
export async function importDroppedFiles(files: FileList): Promise<void> {
  for (const file of Array.from(files)) {
    if (isProjectFile(file)) {
      await openProjectFile(file, 'drop')
    } else if (file.name.toLowerCase().endsWith('.gpx')) {
      await importGpxFile(file, 'drop')
    } else if (file.type.startsWith('image/')) {
      await importImageFile(file, 'drop')
    } else {
      useAppStore
        .getState()
        .setImportError(`Unsupported file type: "${file.name}"`)
    }
  }
}
