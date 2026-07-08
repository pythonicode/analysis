import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { del, get, set as idbSet } from 'idb-keyval'
import type {
  Annotation,
  DrawnPath,
  GpxTrack,
  MapImage,
  MarkerDisplayMode,
  Point,
  Tool,
  Viewport,
} from './types'

/** The undoable part of the state: the analysis content itself. */
interface Snapshot {
  paths: DrawnPath[]
  tracks: GpxTrack[]
  annotations: Annotation[]
}

/** Loadable project content: what Save/Open and persistence care about. */
export interface ProjectData extends Snapshot {
  mapImage: MapImage | null
}

/** IndexedDB-backed storage; localStorage is too small for embedded map images. */
const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}

const HISTORY_LIMIT = 100

interface AppState extends Snapshot {
  activeTool: Tool
  mapImage: MapImage | null
  strokeWidth: number
  strokeColor: string
  strokeOpacity: number
  viewport: Viewport
  pointer: Point | null
  selectedId: string | null
  importError: string | null
  annotationsOpen: boolean
  markerDisplayMode: MarkerDisplayMode
  toastMessage: string | null

  past: Snapshot[]
  future: Snapshot[]
  /** Key of the last recorded edit, used to coalesce rapid edits (e.g. typing) into one entry */
  lastCoalesceKey: string | null

  setActiveTool: (tool: Tool) => void
  setMapImage: (image: MapImage | null) => void
  setStrokeWidth: (width: number) => void
  setStrokeColor: (color: string) => void
  setStrokeOpacity: (opacity: number) => void
  setViewport: (viewport: Viewport) => void
  setPointer: (pointer: Point | null) => void
  setSelectedId: (id: string | null) => void
  setImportError: (error: string | null) => void
  openAnnotations: () => void
  closeAnnotations: () => void
  toggleAnnotations: () => void
  setMarkerDisplayMode: (mode: MarkerDisplayMode) => void
  setToastMessage: (message: string | null) => void

  addTrack: (track: GpxTrack) => void
  /** Pass a coalesceKey to merge rapid consecutive edits (e.g. slider drags) into one undo step */
  updateTrack: (
    id: string,
    patch: Partial<GpxTrack>,
    coalesceKey?: string,
  ) => void
  removeTrack: (id: string) => void

  addPath: (path: DrawnPath) => void
  updatePath: (id: string, patch: Partial<DrawnPath>) => void
  removePath: (id: string) => void

  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void

  /** Replaces the current project content (e.g. when opening a saved project file). */
  loadProject: (data: ProjectData) => void

  /** Clears all project content and returns the app to its initial state. */
  newProject: () => void

  undo: () => void
  redo: () => void
}

function takeSnapshot(s: Snapshot): Snapshot {
  return { paths: s.paths, tracks: s.tracks, annotations: s.annotations }
}

/**
 * Returns the history fields for a new edit. When the coalesce key matches the
 * previous edit (e.g. consecutive keystrokes in the same field), the existing
 * history entry is reused instead of pushing a new one.
 */
function record(
  s: AppState,
  coalesceKey: string | null,
): Pick<AppState, 'past' | 'future' | 'lastCoalesceKey'> {
  if (coalesceKey !== null && coalesceKey === s.lastCoalesceKey) {
    return { past: s.past, future: [], lastCoalesceKey: coalesceKey }
  }
  return {
    past: [...s.past, takeSnapshot(s)].slice(-HISTORY_LIMIT),
    future: [],
    lastCoalesceKey: coalesceKey,
  }
}

/** Drops the selection if the selected item no longer exists in the snapshot. */
function reconcileSelection(
  selectedId: string | null,
  snapshot: Snapshot,
): string | null {
  if (!selectedId) return null
  const exists =
    snapshot.paths.some((p) => p.id === selectedId) ||
    snapshot.tracks.some((t) => t.id === selectedId) ||
    snapshot.annotations.some((a) => a.id === selectedId)
  return exists ? selectedId : null
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTool: 'select',
  mapImage: null,
  tracks: [],
  paths: [],
  annotations: [],
  strokeWidth: 4,
  strokeColor: '#e11d48',
  strokeOpacity: 0.5,
  viewport: { scale: 1, x: 0, y: 0 },
  pointer: null,
  selectedId: null,
  importError: null,
  annotationsOpen: false,
  markerDisplayMode: 'labels',
  toastMessage: null,

  past: [],
  future: [],
  lastCoalesceKey: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setMapImage: (image) => set({ mapImage: image }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeOpacity: (opacity) => set({ strokeOpacity: opacity }),
  setViewport: (viewport) => set({ viewport }),
  setPointer: (pointer) => set({ pointer }),
  setSelectedId: (id) => set({ selectedId: id }),
  setImportError: (error) => set({ importError: error }),
  openAnnotations: () => set({ annotationsOpen: true }),
  closeAnnotations: () => set({ annotationsOpen: false }),
  toggleAnnotations: () =>
    set((s) => ({ annotationsOpen: !s.annotationsOpen })),
  setMarkerDisplayMode: (mode) => set({ markerDisplayMode: mode }),
  setToastMessage: (message) => set({ toastMessage: message }),

  addTrack: (track) =>
    set((s) => ({ ...record(s, null), tracks: [...s.tracks, track] })),
  updateTrack: (id, patch, coalesceKey) =>
    set((s) => ({
      ...record(s, coalesceKey ?? null),
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTrack: (id) =>
    set((s) => ({
      ...record(s, null),
      tracks: s.tracks.filter((t) => t.id !== id),
    })),

  addPath: (path) =>
    set((s) => ({ ...record(s, null), paths: [...s.paths, path] })),
  updatePath: (id, patch) =>
    set((s) => ({
      ...record(s, null),
      paths: s.paths.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePath: (id) =>
    set((s) => ({
      ...record(s, null),
      paths: s.paths.filter((p) => p.id !== id),
    })),

  addAnnotation: (annotation) =>
    set((s) => ({
      ...record(s, null),
      annotations: [...s.annotations, annotation],
    })),
  updateAnnotation: (id, patch) =>
    set((s) => ({
      // Coalesce rapid edits to the same annotation fields (typing) into one undo step
      ...record(s, `annotation:${id}:${Object.keys(patch).sort().join(',')}`),
      annotations: s.annotations.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    })),
  removeAnnotation: (id) =>
    set((s) => ({
      ...record(s, null),
      annotations: s.annotations.filter((a) => a.id !== id),
    })),

  loadProject: (data) =>
    set({
      mapImage: data.mapImage,
      tracks: data.tracks,
      paths: data.paths,
      annotations: data.annotations,
      past: [],
      future: [],
      lastCoalesceKey: null,
      selectedId: null,
      viewport: { scale: 1, x: 0, y: 0 },
      importError: null,
    }),

  newProject: () =>
    set({
      activeTool: 'select',
      mapImage: null,
      tracks: [],
      paths: [],
      annotations: [],
      viewport: { scale: 1, x: 0, y: 0 },
      pointer: null,
      selectedId: null,
      importError: null,
      past: [],
      future: [],
      lastCoalesceKey: null,
    }),

  undo: () =>
    set((s) => {
      const previous = s.past[s.past.length - 1]
      if (!previous) return {}
      return {
        ...previous,
        past: s.past.slice(0, -1),
        future: [...s.future, takeSnapshot(s)],
        lastCoalesceKey: null,
        selectedId: reconcileSelection(s.selectedId, previous),
      }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[s.future.length - 1]
      if (!next) return {}
      return {
        ...next,
        past: [...s.past, takeSnapshot(s)],
        future: s.future.slice(0, -1),
        lastCoalesceKey: null,
        selectedId: reconcileSelection(s.selectedId, next),
      }
    }),
    }),
    {
      name: 'map-analysis',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        mapImage: s.mapImage,
        tracks: s.tracks,
        paths: s.paths,
        annotations: s.annotations,
        strokeWidth: s.strokeWidth,
        strokeColor: s.strokeColor,
        strokeOpacity: s.strokeOpacity,
        viewport: s.viewport,
        markerDisplayMode: s.markerDisplayMode,
      }),
    },
  ),
)
