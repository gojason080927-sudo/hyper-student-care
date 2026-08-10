import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      filename: 'teacher/sw.js',
      scope: '/teacher/',
      includeAssets: [
        'hyper-brand-cover-v1.png',
        'apple-touch-icon.png',
        'teacher/hyper-teacher-v3-192.png',
        'teacher/hyper-teacher-v3-512.png',
        'teacher/hyper-teacher-v3-maskable-512.png',
        'teacher/hyper-teacher-v3-apple-touch.png',
        'teacher/manifest.webmanifest',
        'care/hyper-icon-v6-192.png',
        'care/hyper-icon-v6-512.png',
        'care/hyper-icon-v6-maskable.png',
        'care/hyper-icon-v6-splash.png',
        'care/hyper-icon-v6-apple-touch.png',
        'care/hyper-icon-v6-favicon-32.png',
        'care/hyper-icon-v6-favicon-16.png',
        'care/manifest.webmanifest',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/care\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
