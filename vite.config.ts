import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)))

function copyPdfjsSupportFiles() {
  const srcRoot = resolve(repoRoot, 'node_modules/pdfjs-dist')
  const destRoot = resolve(repoRoot, 'public/pdfjs')
  for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    const from = resolve(srcRoot, dir)
    if (!existsSync(from)) continue
    mkdirSync(destRoot, { recursive: true })
    cpSync(from, resolve(destRoot, dir), { recursive: true })
  }
}

copyPdfjsSupportFiles()

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
      workbox: {
        // Keep the teacher SW small so Android can activate it. A failed/huge
        // precache leaves the page uncontrolled and Chrome installs a shortcut.
        // SW lives at /teacher/sw.js; relative precache URLs would resolve to
        // /teacher/index.html and /teacher/teacher/... — force origin-absolute.
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.map((entry) => ({
              ...entry,
              url: entry.url.startsWith('/') ? entry.url : `/${entry.url}`,
            })),
            warnings: [],
          }),
        ],
        globPatterns: [
          'index.html',
          'assets/*.css',
          'teacher/manifest.webmanifest',
          'teacher/hyper-teacher-icon-192-v5.png',
          'teacher/hyper-teacher-icon-512-v5.png',
          'teacher/hyper-teacher-maskable-192-v5.png',
          'teacher/hyper-teacher-maskable-512-v5.png',
        ],
        globIgnores: [
          '**/care/**',
          '**/*정시*',
          '**/v124RecommendationRecords*',
          '**/*.map',
        ],
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
