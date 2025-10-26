// client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://tau-2032-portal-server.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
