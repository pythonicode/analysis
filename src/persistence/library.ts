import {
  createStore,
  del,
  get,
  keys,
  set,
  del as delLegacy,
  get as getLegacy,
} from 'idb-keyval'
import { t } from '../i18n'
import type {
  Annotation,
  DrawnPath,
  GpxTrack,
  MapImage,
  MarkerDisplayMode,
} from '../types'

/** Stored name for a project that has not been named. Shown translated via projectDisplayName(). */
export const DEFAULT_PROJECT_NAME = 'Untitled project'

/** The name to show on screen: the default name is translated, anything the user typed is shown as-is. */
export function projectDisplayName(name: string): string {
  return name === DEFAULT_PROJECT_NAME ? t('project.untitled') : name
}

/** Name for a project that has none: the map's name, or the default. */
export function defaultProjectName(mapImageName: string | null | undefined): string {
  const base = mapImageName?.replace(/\.[^.]+$/, '').trim()
  return base || DEFAULT_PROJECT_NAME
}

/** Everything saved for one project. Pointer and pan/zoom are intentionally absent. */
export interface PersistedProject {
  projectId: string
  projectName: string
  mapImage: MapImage | null
  tracks: GpxTrack[]
  paths: DrawnPath[]
  annotations: Annotation[]
  strokeWidth: number
  strokeColor: string
  strokeOpacity: number
  markerDisplayMode: MarkerDisplayMode
  annotationTextScalePct: number
  rotation: number
}

/** Library listing entry, kept separate from the heavy project records. */
export interface ProjectMeta {
  id: string
  name: string
  /** Name of the map image, if one has been imported */
  mapName: string | null
  createdAt: number
  updatedAt: number
}

const libraryStore = createStore('o-analysis-library', 'projects')

const ACTIVE_KEY = 'active'
const metaKey = (id: string) => `meta:${id}`
const stateKey = (id: string) => `state:${id}`
const imageKey = (id: string) => `image:${id}`
const thumbKey = (id: string) => `thumb:${id}`

/** Keys written by the single-project storage that predates the library. */
const LEGACY_KEY = 'map-analysis'

export function newProjectId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function getActiveProjectId(): Promise<string | null> {
  return (await get<string>(ACTIVE_KEY, libraryStore)) ?? null
}

export async function setActiveProjectId(id: string): Promise<void> {
  await set(ACTIVE_KEY, id, libraryStore)
}

export async function readMeta(id: string): Promise<ProjectMeta | null> {
  return (await get<ProjectMeta>(metaKey(id), libraryStore)) ?? null
}

export async function writeMeta(meta: ProjectMeta): Promise<void> {
  await set(metaKey(meta.id), meta, libraryStore)
}

/** All saved projects, most recently changed first. */
export async function listProjectMetas(): Promise<ProjectMeta[]> {
  const allKeys = await keys(libraryStore)
  const metaKeys = allKeys.filter(
    (k): k is string => typeof k === 'string' && k.startsWith('meta:'),
  )
  const metas = await Promise.all(
    metaKeys.map((k) => get<ProjectMeta>(k, libraryStore)),
  )
  return metas
    .filter((m): m is ProjectMeta => m !== undefined)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Reads a project, restoring the map image from its blob. Null if it was never saved. */
export async function readProjectState(
  id: string,
): Promise<PersistedProject | null> {
  const raw = await get<string>(stateKey(id), libraryStore)
  if (!raw) return null
  const state = JSON.parse(raw) as PersistedProject
  if (state.mapImage && !state.mapImage.src) {
    const blob = await get<Blob>(imageKey(id), libraryStore)
    state.mapImage = blob
      ? { ...state.mapImage, src: await blobToDataUrl(blob) }
      : null
  }
  return state
}

/** Writes project JSON with the map image replaced by a placeholder. */
export async function writeProjectState(
  state: PersistedProject,
): Promise<void> {
  const withPlaceholder: PersistedProject = {
    ...state,
    mapImage: state.mapImage ? { ...state.mapImage, src: '' } : null,
  }
  await set(stateKey(state.projectId), JSON.stringify(withPlaceholder), libraryStore)
}

export async function writeProjectImage(
  id: string,
  image: Blob | null,
  thumbnail: Blob | null,
): Promise<void> {
  if (image) await set(imageKey(id), image, libraryStore)
  else await del(imageKey(id), libraryStore)
  if (thumbnail) await set(thumbKey(id), thumbnail, libraryStore)
  else await del(thumbKey(id), libraryStore)
}

export async function readThumbnail(id: string): Promise<Blob | null> {
  return (await get<Blob>(thumbKey(id), libraryStore)) ?? null
}

export async function deleteProjectRecords(id: string): Promise<void> {
  await del(stateKey(id), libraryStore)
  await del(imageKey(id), libraryStore)
  await del(thumbKey(id), libraryStore)
  await del(metaKey(id), libraryStore)
  if ((await getActiveProjectId()) === id) {
    await del(ACTIVE_KEY, libraryStore)
  }
}

/**
 * Moves the single project saved by the previous storage format into the
 * library. Returns the migrated project, or null when there is nothing to move.
 */
export async function takeLegacyProject(): Promise<PersistedProject | null> {
  const raw = await getLegacy<string>(LEGACY_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw) as { state: Omit<PersistedProject, 'projectId' | 'projectName'> }
  const legacy = parsed.state
  const id = newProjectId()

  let mapImage = legacy.mapImage
  if (mapImage && !mapImage.src) {
    const blob = await getLegacy<Blob>(`${LEGACY_KEY}:image`)
    mapImage = blob ? { ...mapImage, src: await blobToDataUrl(blob) } : null
  }

  const state: PersistedProject = {
    ...legacy,
    mapImage,
    projectId: id,
    projectName: mapImage?.name.replace(/\.[^.]+$/, '') || DEFAULT_PROJECT_NAME,
  }
  return state
}

/** Removes the legacy keys once their contents are in the library. */
export async function deleteLegacyProject(): Promise<void> {
  await delLegacy(LEGACY_KEY)
  await delLegacy(`${LEGACY_KEY}:image`)
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
