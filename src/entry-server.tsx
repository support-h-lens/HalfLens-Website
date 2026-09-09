import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import {
  createPublicWebsiteContent,
  fallbackPublicWebsiteContent,
} from './lib/cmsContent'
import type { PublicWebsiteContent } from './lib/cmsContent'
import { getRouteSeo } from './lib/routeSeo'

export { createPublicWebsiteContent, fallbackPublicWebsiteContent, getRouteSeo }

export function renderRoute(pathname: string, content: PublicWebsiteContent) {
  return renderToString(
    <StrictMode>
      <App pathname={pathname} initialContent={content} />
    </StrictMode>,
  )
}
