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
import { t, type MessageKey } from '../i18n'

export const SWATCHES = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b']

export const TOOLS: {
  id: Tool
  /** Message keys; translate with t() at render time */
  label: MessageKey
  shortLabel: MessageKey
  tip: MessageKey
  touchTip: MessageKey
  /** Desktop keyboard shortcut; matches toolbar order (1–6) */
  hotkey: string
  icon: typeof Hand
}[] = [
  {
    id: 'select',
    label: 'tool.select',
    shortLabel: 'tool.select',
    tip: 'tool.select.tip',
    touchTip: 'tool.select.touchTip',
    hotkey: '1',
    icon: MousePointer2,
  },
  {
    id: 'pan',
    label: 'tool.pan',
    shortLabel: 'tool.pan',
    tip: 'tool.pan.tip',
    touchTip: 'tool.pan.touchTip',
    hotkey: '2',
    icon: Hand,
  },
  {
    id: 'line',
    label: 'tool.line',
    shortLabel: 'tool.line',
    tip: 'tool.line.tip',
    touchTip: 'tool.line.touchTip',
    hotkey: '3',
    icon: Pencil,
  },
  {
    id: 'marker',
    label: 'tool.marker',
    shortLabel: 'tool.marker',
    tip: 'tool.marker.tip',
    touchTip: 'tool.marker.touchTip',
    hotkey: '4',
    icon: MapPin,
  },
  {
    id: 'eraser',
    label: 'tool.eraser',
    shortLabel: 'tool.eraser',
    tip: 'tool.eraser.tip',
    touchTip: 'tool.eraser.touchTip',
    hotkey: '5',
    icon: Eraser,
  },
  {
    id: 'gpx',
    label: 'tool.gpx',
    shortLabel: 'tool.gpxShort',
    tip: 'tool.gpx.tip',
    touchTip: 'tool.gpx.touchTip',
    hotkey: '6',
    icon: Anchor,
  },
]

/** Resolve a tool from a keyboard key (number row or numpad). */
export function getToolByHotkey(key: string): (typeof TOOLS)[number] | undefined {
  // Numpad Digits use '1'..'6' as key as well; Digit1 etc. handled via e.key
  return TOOLS.find((t) => t.hotkey === key)
}

export function getToolTip(id: Tool, layoutMode: LayoutMode): string {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) return ''
  return t(layoutMode === 'touch' ? tool.touchTip : tool.tip)
}

export function getToolLabel(id: Tool): string {
  const key = TOOLS.find((tool) => tool.id === id)?.label
  return key ? t(key) : id
}
