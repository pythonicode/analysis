import { useAppStore } from '../store'

export default function StatusBar() {
  const activeTool = useAppStore((s) => s.activeTool)
  const viewport = useAppStore((s) => s.viewport)
  const pointer = useAppStore((s) => s.pointer)

  return (
    <footer className="statusbar">
      <span>Zoom: {Math.round(viewport.scale * 100)}%</span>
      <span>
        {pointer
          ? `X: ${Math.round(pointer.x)} Y: ${Math.round(pointer.y)}`
          : 'X: — Y: —'}
      </span>
      <span className="statusbar-tool">Tool: {activeTool}</span>
    </footer>
  )
}
