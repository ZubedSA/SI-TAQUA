import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/ - cache cleared// Trigger reload for mobile touch fix test
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000, // Increase limit to 4MB for precaching
        importScripts: ['custom-sw.js'], // Push notification handler
      },
      manifest: {
        name: 'Sistem Informasi Al-Usymuni (Si-TaQua)',
        short_name: 'Si-TaQua',
        description: 'Sistem Informasi Pondok Pesantren Tahfizh Qur\'an Al-Usymuni Batuan - Manajemen santri, guru, hafalan, dan nilai',
        theme_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'favicon.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-pwa-white.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts';
            if (id.includes('jspdf') || id.includes('xlsx') || id.includes('html5-qrcode') || id.includes('qrcode.react')) return 'vendor-utils';
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        }
      }
    }
  }
})
