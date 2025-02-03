import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import csp from "vite-plugin-csp-guard";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    csp({
      algorithm: "sha384",
      dev: { run: true },
      build: { sri: true },
      policy: {
        "script-src": ["'self'"],
        "style-src-elem": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'"],
        "connect-src": ["ws://localhost:8080", "localhost:8080", "'self'"]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  }
})
