import Konva from 'konva'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'
import { initServiceWorker } from './pwa.ts'
import { initI18n } from './i18n'

// Avoid 0×0 shadow-cache canvases when browser zoom lowers devicePixelRatio.
Konva.pixelRatio = 1

initServiceWorker()

// Load the saved or detected language before the first render, so nothing flashes in English
void initI18n().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  )
})
