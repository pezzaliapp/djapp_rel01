import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [react()],

  base: '/djapp/',

  resolve: {
    alias: {
      '@':           fileURLToPath(new URL('./src', import.meta.url)),
      '@audio':      fileURLToPath(new URL('./src/audio-engine', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@store':      fileURLToPath(new URL('./src/store', import.meta.url)),
      '@hooks':      fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@utils':      fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },

  build: {
    outDir: 'dist',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'zustand': ['zustand'],
        },
        // Nomi stabili — il CSS non cambia hash ad ogni build
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'assets/index-DJw73BJx.css'
          return 'assets/[name]-[hash][extname]'
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  server: {
    port: 3000,
    host: true,
  },

  worker: { format: 'es' },
})
