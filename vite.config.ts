import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function immutableMediaCache(): Plugin {
  return {
    name: 'h-lens-immutable-media-cache',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (
          (request as { url?: string }).url?.startsWith('/media/')
          || (request as { url?: string }).url?.startsWith('/experimental/cinematic-sequence/')
        ) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (
          (request as { url?: string }).url?.startsWith('/media/')
          || (request as { url?: string }).url?.startsWith('/experimental/cinematic-sequence/')
        ) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), immutableMediaCache()],
  server: {
    host: true,
    port: 5173,
  },
})
