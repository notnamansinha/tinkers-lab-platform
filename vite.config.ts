/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (d) =>
            !d.includes('vendor-firebase') &&
            !d.includes('vendor-charts') &&
            !d.includes('vendor-form'),
        )
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
          // Firebase split into core/auth/firestore/storage so no single
          // vendor chunk exceeds the 600 kB warning limit.
          if (id.includes('node_modules/firebase/firestore')) {
            return 'vendor-firebase-firestore'
          }
          if (id.includes('node_modules/firebase/auth')) {
            return 'vendor-firebase-auth'
          }
          if (id.includes('node_modules/firebase/storage')) {
            return 'vendor-firebase-storage'
          }
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase-core'
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query'
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform') || id.includes('node_modules/zod')) {
            return 'vendor-form'
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/sonner') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
