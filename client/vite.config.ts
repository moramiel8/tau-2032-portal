// client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.ts
export default defineConfig({
  base: '/',         // or correct base if app is under /client
  build: {
    outDir: 'dist',  // and deploy the contents of dist directly
  },
});
