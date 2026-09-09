import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource/cairo/arabic-400.css'
import '@fontsource/cairo/arabic-500.css'
import '@fontsource/cairo/arabic-600.css'
import '@fontsource/cairo/arabic-700.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import App from './App'
import './styles/global.css'
import './styles/brand-redesign.css'
import './styles/editorial-motion.css'
import type { PublicWebsiteContent } from './lib/cmsContent'

const contentElement = document.getElementById('h-lens-content')
let initialContent: PublicWebsiteContent | undefined

if (contentElement?.textContent) {
  try {
    initialContent = JSON.parse(contentElement.textContent) as PublicWebsiteContent
  } catch {
    initialContent = undefined
  }
}

const rootElement = document.getElementById('root')!
const application = (
  <StrictMode>
    <App initialContent={initialContent} />
  </StrictMode>
)

if (rootElement.hasChildNodes()) hydrateRoot(rootElement, application)
else createRoot(rootElement).render(application)
