import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    alias: {
      '@': path.resolve(__dirname, '../web-app/src'),
      '@plugin': path.resolve(__dirname, 'src'),
      'next/head': path.resolve(__dirname, 'stubs/Head.tsx'),
      'next/script': path.resolve(__dirname, 'stubs/Script.tsx'),
      'next/navigation': path.resolve(__dirname, 'stubs/navigation.ts'),
      'next/dynamic': path.resolve(__dirname, 'stubs/dynamic.tsx'),
      '@/lib/firebaseConfig': path.resolve(__dirname, 'stubs/firebaseConfig.ts'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.NEXT_PUBLIC_API_BASE': JSON.stringify('/wp-json/shooters-hub/v1/proxy'),
    'process.env.NEXT_PUBLIC_OLC_API_BASE': JSON.stringify('/wp-json/shooters-hub/v1/proxy/olc'),
    'process.env.NEXT_PUBLIC_ENABLE_FINDER_DEMO': JSON.stringify('0'),
    'process.env.NEXT_PUBLIC_ENABLE_OLC_DIAGNOSTICS': JSON.stringify('0'),
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    cssCodeSplit: false,
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
