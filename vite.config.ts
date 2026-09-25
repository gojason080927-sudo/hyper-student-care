import { cpSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { dirname, relative, resolve, sep } from 'node:path'
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

const studioRoot = resolve(repoRoot, 'textbooks/hyper-english')
const studioVendor: Record<string, string> = {
  'pdf.mjs': resolve(repoRoot, 'node_modules/pdfjs-dist/build/pdf.mjs'),
  'pdf.worker.mjs': resolve(repoRoot, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
}

function studioFile(rel: string) {
  if (rel.startsWith('vendor/')) return studioVendor[rel.slice('vendor/'.length)]
  if (rel === 'out' || rel.startsWith(`out${sep}`) || rel.startsWith('out/')) return undefined
  const file = resolve(studioRoot, rel)
  const fromRoot = relative(studioRoot, file)
  if (fromRoot.startsWith('..') || fromRoot === 'out' || fromRoot.startsWith(`out${sep}`)) return undefined
  return file
}

function textbookStudioPlugin() {
  return {
    name: 'textbook-studio',
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith('/textbook-studio/')) return next()
        const rel = decodeURIComponent(url.slice('/textbook-studio/'.length))
        const file = studioFile(rel)
        if (!file || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404
          res.end()
          return
        }
        const ext = file.slice(file.lastIndexOf('.'))
        const types: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.mjs': 'text/javascript; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.txt': 'text/plain; charset=utf-8',
        }
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      const dest = resolve(repoRoot, 'dist/textbook-studio')
      cpSync(studioRoot, dest, {
        recursive: true,
        filter: (src) => {
          const rel = relative(studioRoot, src)
          return rel !== 'out' && !rel.startsWith(`out${sep}`)
        },
      })
      mkdirSync(resolve(dest, 'vendor'), { recursive: true })
      for (const [name, from] of Object.entries(studioVendor)) {
        if (existsSync(from)) cpSync(from, resolve(dest, 'vendor', name))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    textbookStudioPlugin(),
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
        navigateFallbackDenylist: [/^\/care\//, /^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['/teacher/push-handlers.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/api\/voice-transcribe/i,
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: /\/api\/voice-transcribe/i,
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
