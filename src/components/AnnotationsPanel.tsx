import { useEffect, useRef } from 'react'
import { MessageSquareText, Trash2 } from 'lucide-react'
import { useAppStore } from '../store'
import { stageRef } from '../stageRef'
import { markerLabel } from '../utils/labels'
import type { Annotation } from '../types'
import type { LayoutMode } from '../hooks/useLayoutMode'
import Tooltip from './Tooltip'
import BottomSheet from './BottomSheet'
import SlideDrawer from './SlideDrawer'

function AnnotationItem({
  annotation,
  index,
  selected,
  layoutMode,
}: {
  annotation: Annotation
  index: number
  selected: boolean
  layoutMode: LayoutMode
}) {
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updateAnnotation = useAppStore((s) => s.updateAnnotation)
  const removeAnnotation = useAppStore((s) => s.removeAnnotation)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (selected && annotation.comment === '') {
      commentInputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const centerOnMarker = () => {
    setSelectedId(annotation.id)
    const stage = stageRef.current
    if (!stage) return
    const { viewport, setViewport } = useAppStore.getState()
    setViewport({
      scale: viewport.scale,
      x: stage.width() / 2 - annotation.position.x * viewport.scale,
      y: stage.height() / 2 - annotation.position.y * viewport.scale,
    })
  }

  const deleteButton = (
    <button
      type="button"
      className="annotation-delete"
      aria-label={`Delete annotation ${markerLabel(index)}`}
      onClick={(e) => {
        e.stopPropagation()
        removeAnnotation(annotation.id)
      }}
    >
      <Trash2 size={14} aria-hidden />
    </button>
  )

  return (
    <li
      className={`annotation-item${selected ? ' selected' : ''}`}
      onClick={centerOnMarker}
    >
      <span
        className="annotation-marker"
        style={{ background: annotation.color }}
      >
        {markerLabel(index)}
      </span>
      <div className="annotation-body">
        <div className="annotation-row">
          <textarea
            ref={commentInputRef}
            className="annotation-comment-input"
            placeholder="Add a comment…"
            rows={2}
            value={annotation.comment}
            onClick={(e) => e.stopPropagation()}
            onFocus={() => setSelectedId(annotation.id)}
            onChange={(e) =>
              updateAnnotation(annotation.id, { comment: e.target.value })
            }
          />
          {layoutMode === 'touch' ? (
            deleteButton
          ) : (
            <Tooltip content="Remove this marker">{deleteButton}</Tooltip>
          )}
        </div>
      </div>
    </li>
  )
}

function AnnotationsContent({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const annotations = useAppStore((s) => s.annotations)
  const selectedId = useAppStore((s) => s.selectedId)

  return (
    <>
      <div className="panel-header">
        <MessageSquareText size={16} aria-hidden />
        <h2>Annotations</h2>
      </div>

      {annotations.length === 0 ? (
        <p className="panel-empty">
          No annotations yet. Use the marker tool to add comments to the map.
        </p>
      ) : (
        <ul className="annotation-list">
          {annotations.map((annotation, index) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              index={index}
              selected={selectedId === annotation.id}
              layoutMode={layoutMode}
            />
          ))}
        </ul>
      )}

      <p className="panel-hint">
        {layoutMode === 'touch'
          ? 'Tap a marker letter to centre it on the map. Comments are included in the exported image.'
          : 'Click a marker letter to centre it on the map. Comments are included in the exported image.'}
      </p>
    </>
  )
}

export default function AnnotationsPanel({
  variant,
  layoutMode,
}: {
  variant: 'sidebar' | 'drawer' | 'sheet'
  layoutMode: LayoutMode
}) {
  const annotations = useAppStore((s) => s.annotations)
  const annotationsOpen = useAppStore((s) => s.annotationsOpen)
  const toggleAnnotations = useAppStore((s) => s.toggleAnnotations)
  const closeAnnotations = useAppStore((s) => s.closeAnnotations)

  if (variant === 'sidebar') {
    return (
      <aside className="annotations-panel">
        <AnnotationsContent layoutMode={layoutMode} />
      </aside>
    )
  }

  if (variant === 'drawer') {
    return (
      <>
        <button
          type="button"
          className="annotation-toggle"
          aria-label="Toggle annotations"
          aria-expanded={annotationsOpen}
          onClick={toggleAnnotations}
        >
          <MessageSquareText size={16} aria-hidden />
          <span>Notes</span>
          {annotations.length > 0 && (
            <span className="annotation-toggle-badge">{annotations.length}</span>
          )}
        </button>
        <SlideDrawer
          title="Annotations"
          open={annotationsOpen}
          onClose={closeAnnotations}
        >
          <div className="annotations-panel annotations-panel-drawer">
            <AnnotationsContent layoutMode={layoutMode} />
          </div>
        </SlideDrawer>
      </>
    )
  }

  if (!annotationsOpen) return null

  return (
    <BottomSheet title="Annotations" onClose={closeAnnotations}>
      <div className="annotations-panel annotations-panel-sheet">
        <AnnotationsContent layoutMode={layoutMode} />
      </div>
    </BottomSheet>
  )
}
