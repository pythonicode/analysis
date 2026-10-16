import { useAppStore, type ProjectData } from './store'
import { t } from './i18n'
import {
  DEFAULT_PROJECT_NAME,
  defaultProjectName,
  deleteProjectRecords,
  listProjectMetas,
  newProjectId,
  readMeta,
  readProjectState,
  setActiveProjectId,
  writeMeta,
  writeProjectState,
  type PersistedProject,
} from './persistence/library'
import {
  adoptProjectState,
  flushProjectSaves,
  saveProjectNow,
} from './persistence/projectStorage'

/** The per-project settings that stay put when switching projects. */
function sessionSettings(): Omit<
  PersistedProject,
  'projectId' | 'projectName' | 'mapImage' | 'tracks' | 'paths' | 'annotations' | 'rotation'
> {
  const s = useAppStore.getState()
  return {
    strokeWidth: s.strokeWidth,
    strokeColor: s.strokeColor,
    strokeOpacity: s.strokeOpacity,
    markerDisplayMode: s.markerDisplayMode,
    annotationTextScalePct: s.annotationTextScalePct,
  }
}

/** Starts an empty project and makes it the current one. */
export async function createProject(): Promise<void> {
  await flushProjectSaves()
  const id = newProjectId()
  adoptProjectState({
    ...sessionSettings(),
    projectId: id,
    projectName: DEFAULT_PROJECT_NAME,
    mapImage: null,
    tracks: [],
    paths: [],
    annotations: [],
    rotation: 0,
  })
  useAppStore.getState().newProject({ id, name: DEFAULT_PROJECT_NAME })
}

/** Makes a saved library project the current one. */
export async function openLibraryProject(id: string): Promise<void> {
  if (id === useAppStore.getState().projectId) return
  await flushProjectSaves()
  const state = await readProjectState(id)
  if (!state) throw new Error(t('error.projectNotFound'))
  adoptProjectState(state)
  await setActiveProjectId(id)
  useAppStore.getState().loadProject(state)
}

/** Adds project data (from a file or the sample) to the library as a new project and opens it. */
export async function importProject(
  data: ProjectData,
  name?: string,
): Promise<void> {
  await flushProjectSaves()
  const id = newProjectId()
  const state: PersistedProject = {
    ...sessionSettings(),
    projectId: id,
    projectName: name?.trim() || defaultProjectName(data.mapImage?.name),
    mapImage: data.mapImage,
    tracks: data.tracks,
    paths: data.paths,
    annotations: data.annotations,
    rotation: data.rotation ?? 0,
  }
  await saveProjectNow(state)
  adoptProjectState(state)
  await setActiveProjectId(id)
  useAppStore.getState().loadProject(state)
}

/** Renames the current project. Empty names fall back to the default. */
export function renameCurrentProject(name: string): void {
  useAppStore.getState().setProjectName(name.trim() || DEFAULT_PROJECT_NAME)
}

/** Removes a project from the library. Opens another project if the current one is removed. */
export async function deleteLibraryProject(id: string): Promise<void> {
  await flushProjectSaves()
  const wasCurrent = id === useAppStore.getState().projectId
  await deleteProjectRecords(id)
  if (!wasCurrent) return

  const next = (await listProjectMetas()).find((m) => m.id !== id)
  if (next) {
    await openLibraryProject(next.id)
  } else {
    await createProject()
  }
}

/** Renames any library project. The current project is renamed in place. */
export async function renameLibraryProject(id: string, name: string): Promise<void> {
  if (id === useAppStore.getState().projectId) {
    renameCurrentProject(name)
    return
  }
  const clean = name.trim() || DEFAULT_PROJECT_NAME
  const state = await readProjectState(id)
  if (!state) return
  await writeProjectState({ ...state, projectName: clean })
  const meta = await readMeta(id)
  if (meta) await writeMeta({ ...meta, name: clean })
}
