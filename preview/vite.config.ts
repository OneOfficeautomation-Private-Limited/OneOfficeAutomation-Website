import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the preview as one self-contained page: every chunk, style and font inlined.
export default defineConfig({
  root: 'preview',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../preview-dist',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
