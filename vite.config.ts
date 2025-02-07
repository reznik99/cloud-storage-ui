import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import csp from "vite-plugin-csp-guard";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
  },
  plugins: [
    react(),
    csp({
      algorithm: "sha384",
      dev: { run: true },
      build: { sri: true },
      policy: {
        "script-src": ["'self'"],
        "style-src-elem": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["ws://localhost:8080", "localhost:8080", "'self'"]
      }
    })
  ]
})
