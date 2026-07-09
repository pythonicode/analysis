import Konva from 'konva'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'
import { initServiceWorker } from './pwa.ts'

// Avoid 0×0 shadow-cache canvases when browser zoom lowers devicePixelRatio.
Konva.pixelRatio = 1

initServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
