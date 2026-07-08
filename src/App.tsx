import './App.css'
import TopBar from './components/TopBar'
import ToolPalette from './components/ToolPalette'
import CanvasArea from './components/CanvasArea'
import AnnotationsPanel from './components/AnnotationsPanel'
import StatusBar from './components/StatusBar'
import MobileNotice from './components/MobileNotice'
import { useIsMobile } from './hooks/useIsMobile'

function App() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileNotice />
  }

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-main">
        <ToolPalette />
        <CanvasArea />
        <AnnotationsPanel />
      </div>
      <StatusBar />
    </div>
  )
}

export default App
