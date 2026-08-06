import './assets/main.css'
import './lib/i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isMac, isWindows } from './lib/utils/env'

document.documentElement.classList.add('dark')

if (isMac) {
  document.documentElement.classList.add('is-mac')
}
if (isWindows) {
  document.documentElement.classList.add('is-win')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
