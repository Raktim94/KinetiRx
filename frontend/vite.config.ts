import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify -- file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Dev-only convenience: proxy /api/* straight to the Go backend so the
      // SPA can call relative paths in local dev without hitting CORS at
      // all. Production instead relies on VITE_API_URL + the backend's own
      // CORS middleware (see backend/internal/middleware/middleware.go,
      // configured via ALLOWED_ORIGINS), or the nginx reverse proxy set up
      // in deploy/docker-compose.yml.
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
