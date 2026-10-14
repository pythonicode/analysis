import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { hasUnsavedEdits, setSaveState } from '../saveStatus'
import type { MapImage } from '../types'
import {
  dataUrlToBlob,
  deleteLegacyProject,
  getActiveProjectId,
  readMeta,
  readProjectState,
  setActiveProjectId,
  takeLegacyProject,
  writeMeta,
  writeProjectImage,
  writeProjectState,
  type PersistedProject,
} from './library'

const PERSIST_DEBOUNCE_MS = 400
const THUMBNAIL_MAX_PX = 240

/** Ids of projects that have a record in the library */
const recorded = new Set<string>()
/** The project and map image most recently written, or adopted from storage */
let storedProjectId: string | null = null
let storedImage: MapImage | null = null
/** The last state handed to zustand, used to skip no-op writes */
let last: PersistedProject | null = null

let timer: ReturnType<typeof setTimeout> | null = null
let pending: PersistedProject | null = null
/** Serializes writes so a slow write cannot land after a newer one */
let writes: Promise<void> = Promise.resolve()

function samePersisted(a: PersistedProject, b: PersistedProject): boolean {
  return (
    a.projectId === b.projectId &&
    a.projectName === b.projectName &&
    a.mapImage === b.mapImage &&
    a.tracks === b.tracks &&
    a.paths === b.paths &&
    a.annotations === b.annotations &&
    a.strokeWidth === b.strokeWidth &&
    a.strokeColor === b.strokeColor &&
    a.strokeOpacity === b.strokeOpacity &&
    a.markerDisplayMode === b.markerDisplayMode &&
    a.annotationTextScalePct === b.annotationTextScalePct &&
    a.rotation === b.rotation
  )
}

function hasContent(state: PersistedProject): boolean {
  return (
    state.mapImage !== null ||
    state.tracks.length > 0 ||
    state.paths.length > 0 ||
    state.annotations.length > 0
  )
}

/** Downscaled JPEG for the library list. Null if the image cannot be decoded. */
async function makeThumbnail(dataUrl: string): Promise<Blob | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not decode map image'))
      el.src = dataUrl
    })
    const scale = Math.min(1, THUMBNAIL_MAX_PX / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8),
    )
  } catch {
    return null
  }
}

/** Writes one project's record, image, thumbnail and library entry. */
async function persistState(state: PersistedProject): Promise<void> {
  const id = state.projectId
  // Skip brand-new empty projects so creating one does not add a blank library entry
  if (!hasContent(state) && !recorded.has(id)) return

  if (id !== storedProjectId || state.mapImage !== storedImage) {
    if (state.mapImage) {
      const image = await dataUrlToBlob(state.mapImage.src)
      const thumbnail = await makeThumbnail(state.mapImage.src)
      await writeProjectImage(id, image, thumbnail)
    } else {
      await writeProjectImage(id, null, null)
    }
    storedImage = state.mapImage
  }

  await writeProjectState(state)
  const existing = await readMeta(id)
  const now = Date.now()
  await writeMeta({
    id,
    name: state.projectName,
    mapName: state.mapImage?.name ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
  await setActiveProjectId(id)
  storedProjectId = id
  recorded.add(id)
}

function clearPending(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  pending = null
}

function flushNow(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  const job = pending
  pending = null
  if (!job) return
  setSaveState({ status: 'saving', savedAt: null })
  writes = writes
    .then(() => persistState(job))
    .then(() => {
      // A newer edit may have arrived while this write was in flight
      if (!pending) setSaveState({ status: 'saved', savedAt: Date.now() })
    })
    .catch((error: unknown) => {
      console.error('Autosave failed', error)
      setSaveState({ status: 'error', savedAt: null })
    })
}

/** Writes any pending edit now and resolves once every queued write has finished. */
export function flushProjectSaves(): Promise<void> {
  flushNow()
  return writes
}

/**
 * Records that `state` is what storage already holds for its project, so the
 * next autosave only writes what changed. Call after loading a project.
 */
export function adoptProjectState(state: PersistedProject): void {
  clearPending()
  last = state
  storedProjectId = state.projectId
  storedImage = state.mapImage
  if (hasContent(state)) recorded.add(state.projectId)
}

/** Writes a project immediately, bypassing the debounce. Used for imports. */
export function saveProjectNow(state: PersistedProject): Promise<void> {
  clearPending()
  writes = writes.then(() => persistState(state))
  return writes
}

export function createProjectStorage(): PersistStorage<PersistedProject> {
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushNow)
    // Warn only when an edit would be lost; a normal save in progress needs no prompt
    window.addEventListener('beforeunload', (event) => {
      const unsaved = hasUnsavedEdits()
      flushNow()
      if (unsaved) {
        event.preventDefault()
        event.returnValue = ''
      }
    })
  }

  return {
    getItem: async () => {
      const activeId = await getActiveProjectId()
      let state = activeId ? await readProjectState(activeId) : null
      if (!state) {
        // Projects saved before the library existed move into it once
        const legacy = await takeLegacyProject()
        if (legacy) {
          await saveProjectNow(legacy)
          await deleteLegacyProject()
          state = legacy
        }
      }
      if (!state) return null
      adoptProjectState(state)
      return { state, version: 1 } as StorageValue<PersistedProject>
    },
    setItem: (_name, value) => {
      const next = value.state
      if (last && samePersisted(last, next)) return
      last = next
      pending = next
      setSaveState({ status: 'pending', savedAt: null })
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(flushNow, PERSIST_DEBOUNCE_MS)
    },
    removeItem: async () => {
      clearPending()
      last = null
      await writes
    },
  }
}
