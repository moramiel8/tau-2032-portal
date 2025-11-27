// client/vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',      // important: so assets are /assets/...
  build: { outDir: 'dist' }
});

