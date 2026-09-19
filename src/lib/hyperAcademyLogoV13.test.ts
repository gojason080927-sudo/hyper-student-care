/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV13.test.ts
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
const generator = readFileSync('scripts/generate-pwa-icons-v13.mjs', 'utf8')
const teacherPush = readFileSync('public/teacher/push-handlers.js', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V13_FILES = [
  'public/teacher/hyper-teacher-icon-v13-192.png',
  'public/teacher/hyper-teacher-icon-v13-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v13-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v13-512.png',
  'public/care/hyper-parent-icon-v13-192.png',
  'public/care/hyper-parent-icon-v13-512.png',
  'public/care/hyper-parent-icon-maskable-v13-192.png',
  'public/care/hyper-parent-icon-maskable-v13-512.png',
  'public/hub/hyper-hub-icon-v13-192.png',
  'public/hub/hyper-hub-icon-v13-512.png',
  'public/hub/hyper-hub-icon-maskable-v13-192.png',
  'public/hub/hyper-hub-icon-maskable-v13-512.png',
]

const KEPT = [
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
  'public/teacher/hyper-teacher-icon-maskable-v12-512.png',
  'public/teacher/hyper-teacher-icon-v12-512.png',
  'public/hub/hyper-academy-logo-v11.webp',
  'public/hub/hyper-academy-logo-v11.png',
]

for (const file of [...V13_FILES, ...KEPT]) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

function identify(path: string) {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), color: buf[25] }
  }
  throw new Error(`unsupported image header in ${path}`)
}

for (const file of V13_FILES) {
  const meta = identify(file)
  const size = file.includes('512') ? 512 : 192
  assert.equal(meta.format, 'PNG', file)
  assert.equal(meta.width, size, file)
  assert.equal(meta.height, size, file)
  assert.equal(meta.color, 2, `${file} should be opaque RGB`)
}

const apple = identify('public/teacher/hyper-teacher-apple-touch-v12-180.png')
assert.equal(apple.width, 180)
assert.equal(apple.height, 180)
assert.equal(apple.color, 2)

function sameBytes(a: string, b: string) {
  return readFileSync(a).equals(readFileSync(b))
}

assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-icon-v13-512.png',
    'public/teacher/hyper-teacher-icon-maskable-v13-512.png',
  ),
  true,
)
assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-icon-v13-192.png',
    'public/teacher/hyper-teacher-icon-maskable-v13-192.png',
  ),
  true,
)
assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-icon-v13-512.png',
    'public/teacher/hyper-teacher-icon-maskable-v12-512.png',
  ),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v13-512.png', 'public/care/hyper-parent-icon-v13-512.png'),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v13-512.png', 'public/hub/hyper-hub-icon-v13-512.png'),
  true,
)
assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-icon-v13-512.png',
    'public/teacher/hyper-teacher-icon-v12-512.png',
  ),
  false,
)

assert.equal(teacherManifest.id, '/teacher/mobile')
assert.equal(teacherManifest.start_url, '/teacher/mobile')
assert.equal(teacherManifest.scope, '/teacher/')
assert.deepEqual(
  teacherManifest.icons.map((icon: { src: string; sizes: string; purpose: string }) => [
    icon.src,
    icon.sizes,
    icon.purpose,
  ]),
  [
    ['/teacher/hyper-teacher-icon-v13-192.png', '192x192', 'any'],
    ['/teacher/hyper-teacher-icon-v13-512.png', '512x512', 'any'],
    ['/teacher/hyper-teacher-icon-maskable-v13-192.png', '192x192', 'maskable'],
    ['/teacher/hyper-teacher-icon-maskable-v13-512.png', '512x512', 'maskable'],
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
    ['/care/hyper-parent-icon-v13-192.png', '192x192', 'any'],
    ['/care/hyper-parent-icon-v13-512.png', '512x512', 'any'],
    ['/care/hyper-parent-icon-maskable-v13-192.png', '192x192', 'maskable'],
    ['/care/hyper-parent-icon-maskable-v13-512.png', '512x512', 'maskable'],
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
    ['/hub/hyper-hub-icon-v13-192.png', '192x192', 'any'],
    ['/hub/hyper-hub-icon-v13-512.png', '512x512', 'any'],
    ['/hub/hyper-hub-icon-maskable-v13-192.png', '192x192', 'maskable'],
    ['/hub/hyper-hub-icon-maskable-v13-512.png', '512x512', 'maskable'],
  ],
)

assert.match(types, /HUB_ACADEMY_LOGO_WEBP = '\/hub\/hyper-academy-logo-v11\.webp'/)
assert.match(types, /HUB_ACADEMY_LOGO_PNG = '\/hub\/hyper-academy-logo-v11\.png'/)

assert.match(indexHtml, /href="\/teacher\/manifest\.webmanifest"/)
assert.match(indexHtml, /manifest\.href = '\/teacher\/manifest\.webmanifest\?v=10-installable'/)
assert.match(indexHtml, /hyper-teacher-icon-v13-192\.png/)
assert.match(indexHtml, /hyper-parent-icon-v13-192\.png/)
assert.match(indexHtml, /hyper-hub-icon-v13-192\.png/)
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
assert.match(parentRegistrar, /MANIFEST_VERSION = '13'/)
assert.match(hubRegistrar, /hyper-hub-apple-touch-v12-180\.png\?v=12/)

assert.match(teacherPush, /hyper-teacher-icon-v13-192\.png/)
assert.match(careSw, /hyper-parent-icon-v13-192\.png/)
assert.match(hubSw, /hyper-hub-icon-v13-192\.png/)
assert.match(careSw, /addEventListener\('push'/)
assert.match(careSw, /notificationclick/)
assert.match(hubSw, /addEventListener\('push'/)
assert.match(hubSw, /notificationclick/)
assert.match(vite, /teacher\/hyper-teacher-icon-192-v5\.png/)
assert.doesNotMatch(vite, /hyper-teacher-icon-v13/)
assert.match(generator, /any === maskable/)

console.log('hyperAcademyLogoV13.test.ts passed')
