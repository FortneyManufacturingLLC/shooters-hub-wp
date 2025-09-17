import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.tsx'),
      output: {
        entryFileNames: 'match-finder.js',
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith('.css')) return 'match-finder.css';
          return asset.name ? `assets/${asset.name}` : 'assets/[name].[ext]';
        },
      },
    },
  },
});
