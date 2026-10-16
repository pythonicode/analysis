import { useEffect, useState } from 'react'
import { FilePlus, Pencil, Trash2, X } from 'lucide-react'
import { useAppStore } from '../store'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { LayoutMode } from '../hooks/useLayoutMode'
import {
  listProjectMetas,
  projectDisplayName,
  readThumbnail,
  type ProjectMeta,
} from '../persistence/library'
import { flushProjectSaves } from '../persistence/projectStorage'
import {
  createProject,
  deleteLibraryProject,
  openLibraryProject,
  renameLibraryProject,
} from '../projectLibrary'
import { useSaveState } from '../saveStatus'
import { getLocale, useT } from '../i18n'

export default function ProjectLibraryModal({
  layoutMode,
  onClose,
}: {
  layoutMode: LayoutMode
  onClose: () => void
}) {
  const t = useT()
  const currentId = useAppStore((s) => s.projectId)
  const saveState = useSaveState()
  const [metas, setMetas] = useState<ProjectMeta[] | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEscapeKey(onClose)

  // Refresh after the current project's autosave lands, so names and times stay current
  useEffect(() => {
    let cancelled = false
    void (async () => {
      await flushProjectSaves()
      const list = await listProjectMetas()
      if (!cancelled) setMetas(list)
    })()
    return () => {
      cancelled = true
    }
  }, [currentId, saveState.savedAt])

  useEffect(() => {
    if (!metas) return
    let cancelled = false
    const urls: string[] = []
    void (async () => {
      const next: Record<string, string> = {}
      for (const meta of metas) {
        if (cancelled) break
        const blob = await readThumbnail(meta.id)
        if (blob) {
          const url = URL.createObjectURL(blob)
          urls.push(url)
          next[meta.id] = url
        }
      }
      if (!cancelled) setThumbs(next)
    })()
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [metas])

  const refresh = async () => setMetas(await listProjectMetas())

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  const open = (meta: ProjectMeta) =>
    run(async () => {
      await openLibraryProject(meta.id)
      onClose()
    })

  const startNew = () =>
    run(async () => {
      await createProject()
      onClose()
    })

  const commitRename = (meta: ProjectMeta) =>
    run(async () => {
      if (editingId !== meta.id) return
      setEditingId(null)
      if (draftName.trim() !== meta.name) {
        await renameLibraryProject(meta.id, draftName)
      }
      await refresh()
    })

  const remove = (meta: ProjectMeta) => {
    if (confirmDeleteId !== meta.id) {
      setConfirmDeleteId(meta.id)
      return
    }
    void run(async () => {
      setConfirmDeleteId(null)
      await deleteLibraryProject(meta.id)
      if (meta.id === currentId) onClose()
      else await refresh()
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal modal-projects${layoutMode === 'touch' ? ' modal-projects-touch' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-library-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="project-library-title">{t('library.title')}</h2>
          <button
            type="button"
            className="modal-close"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="modal-body project-library-body">
          {error && (
            <p className="export-status export-status-error" role="alert">
              {error}
            </p>
          )}

          {metas === null && <p className="project-library-empty">{t('common.loading')}</p>}

          {metas?.length === 0 && (
            <p className="project-library-empty">
              {t('library.empty')}
            </p>
          )}

          {metas && metas.length > 0 && (
            <ul className="project-library-list">
              {metas.map((meta) => {
                const isCurrent = meta.id === currentId
                const isEditing = editingId === meta.id
                const isConfirming = confirmDeleteId === meta.id
                return (
                  <li
                    key={meta.id}
                    className={`project-library-item${isCurrent ? ' is-current' : ''}`}
                  >
                    {isEditing ? (
                      <form
                        className="project-library-rename"
                        onSubmit={(e) => {
                          e.preventDefault()
                          void commitRename(meta)
                        }}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={draftName}
                          maxLength={80}
                          aria-label={t('top.projectName')}
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={() => void commitRename(meta)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.stopPropagation()
                              setEditingId(null)
                            }
                          }}
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="project-library-open"
                        disabled={busy}
                        onClick={() => void open(meta)}
                      >
                        <span className="project-library-thumb">
                          {thumbs[meta.id] ? (
                            <img src={thumbs[meta.id]} alt="" />
                          ) : null}
                        </span>
                        <span className="project-library-text">
                          <span className="project-library-name">
                            {projectDisplayName(meta.name)}
                            {isCurrent && (
                              <span className="project-library-badge">{t('library.open')}</span>
                            )}
                          </span>
                          <span className="project-library-meta">
                            {t('library.updated', {
                              map: meta.mapName ?? t('library.noMap'),
                              date: new Date(meta.updatedAt).toLocaleString(getLocale(), {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }),
                            })}
                          </span>
                        </span>
                      </button>
                    )}

                    <div className="project-library-actions">
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            className="button"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            className="button button-danger"
                            disabled={busy}
                            onClick={() => remove(meta)}
                          >
                            {t('common.delete')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button button-icon-only"
                            aria-label={t('library.renameAria', { name: meta.name })}
                            title={t('common.rename')}
                            disabled={busy || isEditing}
                            onClick={() => {
                              setEditingId(meta.id)
                              setDraftName(meta.name)
                            }}
                          >
                            <Pencil size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="button button-icon-only"
                            aria-label={t('library.deleteAria', { name: meta.name })}
                            title={t('common.delete')}
                            disabled={busy}
                            onClick={() => remove(meta)}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose}>
            {t('common.close')}
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => void startNew()}
          >
            <FilePlus size={14} aria-hidden />
            {t('action.newProject')}
          </button>
        </div>
      </div>
    </div>
  )
}
