import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../app/src/main/assets/web'),
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true
  }
});
