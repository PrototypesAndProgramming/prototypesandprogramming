import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built output goes straight into ../todo so GitHub Pages serves it at /todo
export default defineConfig({
  plugins: [react()],
  base: '/todo/',
  build: {
    outDir: '../todo',
    emptyOutDir: true,
  },
});
