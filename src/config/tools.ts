import {
  Anchor,
  Eraser,
  Hand,
  MapPin,
  MousePointer2,
  Pencil,
} from 'lucide-react'
import type { LayoutMode } from '../hooks/useLayoutMode'
import type { Tool } from '../types'

export const SWATCHES = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#08060d']

export const TOOLS: {
  id: Tool
  label: string
  shortLabel: string
  tip: string
  touchTip: string
  icon: typeof Hand
}[] = [
  {
    id: 'select',
    label: 'Select',
    shortLabel: 'Select',
    tip: 'Click paths or markers to select them. Press Delete to remove.',
    touchTip: 'Tap paths or markers to select them.',
    icon: MousePointer2,
  },
  {
    id: 'pan',
    label: 'Pan',
    shortLabel: 'Pan',
    tip: 'Drag the map to move around. Hold Space or middle mouse for temporary pan.',
    touchTip: 'Drag with one finger, or use two fingers to pan in any tool.',
    icon: Hand,
  },
  {
    id: 'line',
    label: 'Draw',
    shortLabel: 'Draw',
    tip: 'Click and drag to draw lines on the map.',
    touchTip: 'Drag your finger to draw lines on the map.',
    icon: Pencil,
  },
  {
    id: 'marker',
    label: 'Marker',
    shortLabel: 'Marker',
    tip: 'Click to place a numbered marker with a comment.',
    touchTip: 'Tap to place a numbered marker with a comment.',
    icon: MapPin,
  },
  {
    id: 'eraser',
    label: 'Eraser',
    shortLabel: 'Eraser',
    tip: 'Click or drag over paths and markers to remove them.',
    touchTip: 'Tap or drag over paths and markers to remove them.',
    icon: Eraser,
  },
  {
    id: 'gpx',
    label: 'Adjust GPX',
    shortLabel: 'GPX',
    tip: 'Click the track to add pins, drag to move them, right-click a pin to delete it.',
    touchTip: 'Tap the track to add pins. Long-press a pin to delete it.',
    icon: Anchor,
  },
]

export function getToolTip(id: Tool, layoutMode: LayoutMode): string {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) return ''
  return layoutMode === 'touch' ? tool.touchTip : tool.tip
}

export function getToolLabel(id: Tool): string {
  return TOOLS.find((t) => t.id === id)?.label ?? id
}
