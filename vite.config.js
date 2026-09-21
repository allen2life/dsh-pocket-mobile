import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
