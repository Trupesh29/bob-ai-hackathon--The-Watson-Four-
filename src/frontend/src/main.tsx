import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.classList.add('bg-portflow-canvas', 'text-portflow-ink', 'min-h-screen', 'font-sans')
}

createRoot(rootElement!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
