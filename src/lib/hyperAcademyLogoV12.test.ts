/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV12.test.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const teacherManifest = JSON.parse(readFileSync('public/teacher/manifest.webmanifest', 'utf8'))
const parentManifest = JSON.parse(readFileSync('public/care/manifest.webmanifest', 'utf8'))
const hubManifest = JSON.parse(readFileSync('public/hub/manifest.webmanifest', 'utf8'))
const types = readFileSync('src/hub/types.ts', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const teacherLayout = readFileSync('src/components/teacherMobile/TeacherMobileLayout.tsx', 'utf8')
const teacherRegistrar = readFileSync('src/components/teacherMobile/TeacherPwaRegistrar.tsx', 'utf8')
const parentRegistrar = readFileSync('src/components/parent/ParentPwaRegistrar.tsx', 'utf8')
const hubRegistrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
const parentRoute = readFileSync('src/lib/parentLastCareRoute.ts', 'utf8')
const hubSession = readFileSync('src/hub/hubSession.ts', 'utf8')
const middleware = readFileSync('middleware.ts', 'utf8')
const vite = readFileSync('vite.config.ts', 'utf8')
const generator = readFileSync('scripts/generate-pwa-icons-v12.mjs', 'utf8')
const teacherPush = readFileSync('public/teacher/push-handlers.js', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V12_FILES = [
  'public/hyper-academy-logo-source-v12.png',
  'public/teacher/hyper-teacher-icon-v12-192.png',
  'public/teacher/hyper-teacher-icon-v12-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v12-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v12-512.png',
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-icon-v12-192.png',
  'public/care/hyper-parent-icon-v12-512.png',
  'public/care/hyper-parent-icon-maskable-v12-192.png',
  'public/care/hyper-parent-icon-maskable-v12-512.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-icon-v12-192.png',
  'public/hub/hyper-hub-icon-v12-512.png',
  'public/hub/hyper-hub-icon-maskable-v12-192.png',
  'public/hub/hyper-hub-icon-maskable-v12-512.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
]

const V11_KEPT = [
  'public/teacher/hyper-teacher-icon-v11-192.png',
  'public/teacher/hyper-teacher-icon-v11-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v11-512.png',
  'public/care/hyper-parent-icon-v11-192.png',
  'public/hub/hyper-hub-icon-v11-192.png',
  'public/hub/hyper-academy-logo-v11.png',
  'public/hub/hyper-academy-logo-v11.webp',
]

for (const file of [...V12_FILES, ...V11_KEPT]) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

function identify(path: string) {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), color: buf[25] }
  }
  throw new Error(`unsupported image header in ${path}`)
}

const source = identify('public/hyper-academy-logo-source-v12.png')
assert.equal(source.format, 'PNG')
assert.equal(source.width, 1254)
assert.equal(source.height, 1254)
assert.equal(source.color, 2)

const expected = {
  'public/teacher/hyper-teacher-icon-v12-192.png': 192,
  'public/teacher/hyper-teacher-icon-v12-512.png': 512,
  'public/teacher/hyper-teacher-icon-maskable-v12-192.png': 192,
  'public/teacher/hyper-teacher-icon-maskable-v12-512.png': 512,
  'public/teacher/hyper-teacher-apple-touch-v12-180.png': 180,
  'public/care/hyper-parent-icon-v12-192.png': 192,
  'public/care/hyper-parent-icon-v12-512.png': 512,
  'public/care/hyper-parent-icon-maskable-v12-192.png': 192,
  'public/care/hyper-parent-icon-maskable-v12-512.png': 512,
  'public/care/hyper-parent-apple-touch-v12-180.png': 180,
  'public/hub/hyper-hub-icon-v12-192.png': 192,
  'public/hub/hyper-hub-icon-v12-512.png': 512,
  'public/hub/hyper-hub-icon-maskable-v12-192.png': 192,
  'public/hub/hyper-hub-icon-maskable-v12-512.png': 512,
  'public/hub/hyper-hub-apple-touch-v12-180.png': 180,
} as const

for (const [file, size] of Object.entries(expected)) {
  const meta = identify(file)
  assert.equal(meta.format, 'PNG', file)
  assert.equal(meta.width, size, file)
  assert.equal(meta.height, size, file)
  if (file.includes('apple-touch') || file.includes('maskable')) {
    assert.equal(meta.color, 2, `${file} should be opaque RGB`)
  }
}

assert.equal(teacherManifest.id, '/teacher/mobile')
assert.equal(teacherManifest.start_url, '/teacher/mobile')
assert.equal(teacherManifest.scope, '/teacher/')
assert.equal(teacherManifest.name, 'HYPER TEACHER')
assert.deepEqual(
  teacherManifest.icons.map((icon: { src: string; sizes: string; purpose: string }) => [
    icon.src,
    icon.sizes,
    icon.purpose,
  ]),
  [
    ['/teacher/hyper-teacher-icon-v12-192.png', '192x192', 'any'],
    ['/teacher/hyper-teacher-icon-v12-512.png', '512x512', 'any'],
    ['/teacher/hyper-teacher-icon-maskable-v12-192.png', '192x192', 'maskable'],
    ['/teacher/hyper-teacher-icon-maskable-v12-512.png', '512x512', 'maskable'],
  ],
)

assert.equal(parentManifest.id, '/care/')
assert.equal(parentManifest.start_url, '/care/')
assert.equal(parentManifest.scope, '/care/')
assert.deepEqual(
  parentManifest.icons.map((icon: { src: string; sizes: string; purpose: string }) => [
    icon.src,
    icon.sizes,
    icon.purpose,
  ]),
  [
    ['/care/hyper-parent-icon-v12-192.png', '192x192', 'any'],
    ['/care/hyper-parent-icon-v12-512.png', '512x512', 'any'],
    ['/care/hyper-parent-icon-maskable-v12-192.png', '192x192', 'maskable'],
    ['/care/hyper-parent-icon-maskable-v12-512.png', '512x512', 'maskable'],
  ],
)

assert.equal(hubManifest.id, '/hub/')
assert.equal(hubManifest.start_url, '/hub/')
assert.equal(hubManifest.scope, '/hub/')
assert.deepEqual(
  hubManifest.icons.map((icon: { src: string; sizes: string; purpose: string }) => [
    icon.src,
    icon.sizes,
    icon.purpose,
  ]),
  [
    ['/hub/hyper-hub-icon-v12-192.png', '192x192', 'any'],
    ['/hub/hyper-hub-icon-v12-512.png', '512x512', 'any'],
    ['/hub/hyper-hub-icon-maskable-v12-192.png', '192x192', 'maskable'],
    ['/hub/hyper-hub-icon-maskable-v12-512.png', '512x512', 'maskable'],
  ],
)

assert.match(types, /HUB_ACADEMY_LOGO_WEBP = '\/hub\/hyper-academy-logo-v11\.webp'/)
assert.match(types, /HUB_ACADEMY_LOGO_PNG = '\/hub\/hyper-academy-logo-v11\.png'/)

assert.match(indexHtml, /href="\/teacher\/manifest\.webmanifest"/)
assert.match(indexHtml, /manifest\.href = '\/teacher\/manifest\.webmanifest\?v=10-installable'/)
assert.match(indexHtml, /\/hub\/manifest\.webmanifest\?v=1-installable/)
assert.match(indexHtml, /\/care\/manifest\.webmanifest\?v=10-installable/)
assert.match(indexHtml, /hyper-teacher-icon-v12-192\.png/)
assert.match(indexHtml, /hyper-parent-icon-v12-192\.png/)
assert.match(indexHtml, /hyper-hub-icon-v12-192\.png/)
assert.match(indexHtml, /hyper-teacher-apple-touch-v12-180\.png/)
assert.match(indexHtml, /hyper-parent-apple-touch-v12-180\.png/)
assert.match(indexHtml, /hyper-hub-apple-touch-v12-180\.png/)

assert.match(teacherRegistrar, /\/teacher\/manifest\.webmanifest\?v=10-installable/)
assert.match(parentRoute, /\/care\/manifest\.webmanifest\?v=10-installable/)
assert.match(hubSession, /\/hub\/manifest\.webmanifest\?v=1-installable/)
assert.match(middleware, /\/care\/manifest\.webmanifest\?v=10-installable/)
assert.match(middleware, /\/hub\/manifest\.webmanifest\?v=1-installable/)

assert.match(teacherLayout, /hyper-teacher-apple-touch-v12-180\.png\?v=12/)
assert.match(parentRegistrar, /hyper-parent-apple-touch-v12-180\.png\?v=\$\{MANIFEST_VERSION\}/)
assert.match(parentRegistrar, /MANIFEST_VERSION = '12'/)
assert.match(hubRegistrar, /hyper-hub-apple-touch-v12-180\.png\?v=12/)

assert.match(teacherPush, /hyper-teacher-icon-v12-192\.png/)
assert.match(careSw, /hyper-parent-icon-v12-192\.png/)
assert.match(hubSw, /hyper-hub-icon-v12-192\.png/)
assert.match(careSw, /addEventListener\('push'/)
assert.match(careSw, /notificationclick/)
assert.match(hubSw, /addEventListener\('push'/)
assert.match(hubSw, /notificationclick/)
assert.match(vite, /teacher\/hyper-teacher-icon-192-v5\.png/)
assert.doesNotMatch(vite, /hyper-teacher-icon-v12/)
assert.match(generator, /MASKABLE_FIT = Number\(process\.env\.V12_MASKABLE_FIT \|\| '0\.86'\)/)
assert.match(generator, /IOS_FIT = Number\(process\.env\.V12_IOS_FIT \|\| '0\.97'\)/)

console.log('hyperAcademyLogoV12.test.ts passed')
