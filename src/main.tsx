import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './visuals/global.css'

import { SnackbarProvider } from './contexts/SnackbarContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SnackbarProvider>
      <App />
    </SnackbarProvider>
  </StrictMode>,
)
