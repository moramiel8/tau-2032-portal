// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// אם @vitejs/plugin-react לא מותקן, תריץ פעם אחת:
// npm install -D @vitejs/plugin-react

export default defineConfig({
  plugins: [react()],
  base: "/", // כמו שהיה אצלך
  build: { outDir: "dist" },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001", // השרת שלך
       changeOrigin: true,
        secure: false,
        
      },
    },
  },
});
