import { useEffect } from 'react'
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea'
import { MessageSquareText, Trash2 } from 'lucide-react'
import { useAppStore } from '../store'
import { stageRef } from '../stageRef'
import { markerLabel } from '../utils/labels'
import { mapToLayerLocal } from '../utils/viewport'
import type { Annotation } from '../types'
import type { LayoutMode } from '../hooks/useLayoutMode'
import Tooltip from './Tooltip'
import BottomSheet from './BottomSheet'
import SlideDrawer from './SlideDrawer'
import AnnotationAdvertisement from './AnnotationAdvertisement'

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
  const commentInputRef = useAutoResizeTextarea(annotation.comment)

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
    const { viewport, setViewport, mapImage } = useAppStore.getState()
    const center = mapImage
      ? { x: mapImage.width / 2, y: mapImage.height / 2 }
      : { x: 0, y: 0 }
    const layerPoint = mapToLayerLocal(
      annotation.position,
      center,
      viewport.rotation,
    )
    setViewport({
      scale: viewport.scale,
      rotation: viewport.rotation,
      x: stage.width() / 2 - layerPoint.x * viewport.scale,
      y: stage.height() / 2 - layerPoint.y * viewport.scale,
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
      <Trash2 size={12} aria-hidden />
    </button>
  )

  const markerBadge = (
    <span
      className="annotation-marker"
      style={{ background: annotation.color }}
    >
      {markerLabel(index)}
    </span>
  )

  return (
    <li
      className={`annotation-item${selected ? ' selected' : ''}`}
      onClick={centerOnMarker}
    >
      {layoutMode === 'touch' ? (
        markerBadge
      ) : (
        <Tooltip content="Click to center on the map" side="left">
          {markerBadge}
        </Tooltip>
      )}
      <div className="annotation-body">
        <div className="annotation-row">
          <textarea
            ref={commentInputRef}
            className="annotation-comment-input"
            placeholder="Add a comment…"
            rows={1}
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

function MarkerDisplayToggle() {
  const markerDisplayMode = useAppStore((s) => s.markerDisplayMode)
  const setMarkerDisplayMode = useAppStore((s) => s.setMarkerDisplayMode)

  const labelsButton = (
    <button
      type="button"
      className={markerDisplayMode === 'labels' ? 'active' : ''}
      aria-pressed={markerDisplayMode === 'labels'}
      onClick={() => setMarkerDisplayMode('labels')}
    >
      Labels
    </button>
  )

  const commentsButton = (
    <button
      type="button"
      className={markerDisplayMode === 'comments' ? 'active' : ''}
      aria-pressed={markerDisplayMode === 'comments'}
      onClick={() => setMarkerDisplayMode('comments')}
    >
      Comments
    </button>
  )

  return (
    <div
      className="marker-display-toggle"
      role="group"
      aria-label="Map marker display"
    >
      <Tooltip content="Show letter labels on map markers" side="bottom">
        {labelsButton}
      </Tooltip>
      <Tooltip
        content="Show inline comments on the map. Drag the right edge of a selected comment to change its width."
        side="bottom"
      >
        {commentsButton}
      </Tooltip>
    </div>
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
        <div className="panel-header-title">
          <MessageSquareText size={16} aria-hidden />
          <h2>Annotations</h2>
        </div>
        <MarkerDisplayToggle />
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
        <div className="annotations-panel-scroll">
          <AnnotationsContent layoutMode={layoutMode} />
        </div>
        <AnnotationAdvertisement />
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
            <div className="annotations-panel-scroll">
              <AnnotationsContent layoutMode={layoutMode} />
            </div>
            <AnnotationAdvertisement />
          </div>
        </SlideDrawer>
      </>
    )
  }

  if (!annotationsOpen) return null

  return (
    <BottomSheet
      title="Annotations"
      onClose={closeAnnotations}
      className="bottom-sheet-full"
    >
      <div className="annotations-panel annotations-panel-sheet">
        <div className="annotations-panel-scroll">
          <AnnotationsContent layoutMode={layoutMode} />
        </div>
        <AnnotationAdvertisement />
      </div>
    </BottomSheet>
  )
}
