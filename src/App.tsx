import './App.css'
import TopBar from './components/TopBar'
import ToolPalette from './components/ToolPalette'
import CanvasArea from './components/CanvasArea'
import AnnotationsPanel from './components/AnnotationsPanel'
import StatusBar from './components/StatusBar'
import BottomToolBar from './components/BottomToolBar'
import TouchHints from './components/TouchHints'
import ToastBanner from './components/ToastBanner'
import PwaUpdateBanner from './components/PwaUpdateBanner'
import { useLayoutMode } from './hooks/useLayoutMode'
import { useEffect, useRef } from 'react'
import { useAppStore } from './store'

function App() {
  const layoutMode = useLayoutMode()
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const prevLayoutRef = useRef(layoutMode)

  useEffect(() => {
    if (layoutMode === 'touch' && prevLayoutRef.current !== 'touch') {
      setActiveTool('pan')
    }
    prevLayoutRef.current = layoutMode
  }, [layoutMode, setActiveTool])

  return (
    <div className="app-shell" data-layout={layoutMode}>
      <TopBar layoutMode={layoutMode} />
      <TouchHints />
      <ToastBanner />
      <PwaUpdateBanner />
      <div className="app-main">
        {layoutMode !== 'touch' && <ToolPalette layoutMode={layoutMode} />}
        <CanvasArea layoutMode={layoutMode} />
        {layoutMode === 'desktop' && (
          <AnnotationsPanel variant="sidebar" layoutMode={layoutMode} />
        )}
        {layoutMode === 'compact' && (
          <AnnotationsPanel variant="drawer" layoutMode={layoutMode} />
        )}
        {layoutMode === 'touch' && (
          <AnnotationsPanel variant="sheet" layoutMode={layoutMode} />
        )}
      </div>
      {layoutMode === 'touch' && <BottomToolBar />}
      <StatusBar layoutMode={layoutMode} />
    </div>
  )
}

export default App
