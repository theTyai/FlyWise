import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../..');

export default defineConfig({
  // Read VITE_* settings from the single root .env file. Only names that start with
  // VITE_ are ever exposed to browser code, so the secrets in that file stay private.
  envDir: repo,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': path.resolve(repo, 'shared') },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [repo] },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
