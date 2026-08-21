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
      // 새 배포 시 설치형 강사 PWA가 자동으로 새 SW를 활성화 (수동 프롬프트 의존 최소화)
      registerType: 'autoUpdate',
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
        // 학부모 /care 는 SW navigateFallback 대상에서 제외 (브라우저 정상 fingerprint asset 사용)
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
  server: {
    port: 5174,
    watch: {
      ignored: ['**/.playwright-profile/**'],
    },
  },
})
