// client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/client/', // ← חשוב!
  plugins: [react()],
})
