import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // Ensures asset paths remain relative (./) so it works on any static server
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000, // Inlines small assets into the bundle if desired
  },
  plugins: [viteSingleFile()], // Bundles everything into a clean index.html (if preferred)
});
