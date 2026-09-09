import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

function immutableMediaCache(): Plugin {
  return {
    name: 'h-lens-immutable-media-cache',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request as { url?: string }).url?.startsWith('/media/')) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request as { url?: string }).url?.startsWith('/media/')) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
        next()
      })
    },
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), immutableMediaCache()],
  build: isSsrBuild ? {} : {
    rollupOptions: {
      input: {
        website: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}))
