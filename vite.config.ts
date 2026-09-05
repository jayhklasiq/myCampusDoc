import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const apiPort = process.env.PORT || 3001

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      // The chat API is served by the small Express app in server/ (see
      // server/index.ts) — during dev it runs on its own port and Vite
      // proxies requests to it so the browser only ever talks to one origin.
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
