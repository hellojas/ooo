import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `base` is relative so the build works on GitHub Pages sub-paths and Firebase Hosting alike.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PROJECT OOO — jas fine tuning',
        short_name: 'PROJECT OOO',
        description: 'Sabbatical calendar + tracker, Oct 5 – Dec 23, 2026',
        display: 'standalone',
        background_color: '#EEF1F4',
        theme_color: '#17202A',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'] },
    }),
  ],
})
