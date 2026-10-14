import { useSyncExternalStore } from 'react'

/**
 * idle: nothing has changed this session
 * pending: an edit is waiting for the debounced autosave
 * saving: the autosave write is in progress
 * saved: the latest edit is on disk
 * error: the last autosave failed
 */
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface SaveState {
  status: SaveStatus
  savedAt: number | null
}

let state: SaveState = { status: 'idle', savedAt: null }
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSaveState(next: SaveState): void {
  state = next
  for (const listener of listeners) listener()
}

/** Latest autosave status; re-renders the caller when it changes. */
export function useSaveState(): SaveState {
  return useSyncExternalStore(subscribe, () => state)
}

/** True when the most recent edit has not reached storage yet, or the last write failed. */
export function hasUnsavedEdits(): boolean {
  return state.status === 'pending' || state.status === 'error'
}
