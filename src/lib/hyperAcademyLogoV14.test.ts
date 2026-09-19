/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV14.test.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'

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
const generator = readFileSync('scripts/generate-pwa-icons-v14.mjs', 'utf8')
const teacherPush = readFileSync('public/teacher/push-handlers.js', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V14_FILES = [
  'public/teacher/hyper-teacher-icon-v14-192.png',
  'public/teacher/hyper-teacher-icon-v14-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v14-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v14-512.png',
  'public/care/hyper-parent-icon-v14-192.png',
  'public/care/hyper-parent-icon-v14-512.png',
  'public/care/hyper-parent-icon-maskable-v14-192.png',
  'public/care/hyper-parent-icon-maskable-v14-512.png',
  'public/hub/hyper-hub-icon-v14-192.png',
  'public/hub/hyper-hub-icon-v14-512.png',
  'public/hub/hyper-hub-icon-maskable-v14-192.png',
  'public/hub/hyper-hub-icon-maskable-v14-512.png',
]

const KEPT = [
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
  'public/teacher/hyper-teacher-icon-maskable-v13-512.png',
  'public/teacher/hyper-teacher-icon-v13-512.png',
  'public/hub/hyper-academy-logo-v11.webp',
  'public/hub/hyper-academy-logo-v11.png',
]

for (const file of [...V14_FILES, ...KEPT]) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

function identify(path: string) {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), color: buf[25] }
  }
  throw new Error(`unsupported image header in ${path}`)
}

async function cornerAndExterior(path: string) {
  const { data, info } = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const at = (x: number, y: number) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2]] as const
  }
  const corners = [at(0, 0), at(w - 1, 0), at(0, w - 1), at(w - 1, w - 1)]
  let extWhite = 0
  const seen = new Uint8Array(w * w)
  const stack: number[] = []
  const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= w) return
    const idx = y * w + x
    if (seen[idx]) return
    const i = idx * ch
    if (luma(data[i], data[i + 1], data[i + 2]) < 200) return
    seen[idx] = 1
    stack.push(idx)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, w - 1)
  }
  for (let y = 0; y < w; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length) {
    const idx = stack.pop() as number
    extWhite++
    const x = idx % w
    const y = (idx / w) | 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
  return { corners, extWhite }
}

for (const file of V14_FILES) {
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
    'public/teacher/hyper-teacher-icon-v14-512.png',
    'public/teacher/hyper-teacher-icon-maskable-v14-512.png',
  ),
  true,
)
assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-icon-v14-192.png',
    'public/teacher/hyper-teacher-icon-maskable-v14-192.png',
  ),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v14-512.png', 'public/care/hyper-parent-icon-v14-512.png'),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v14-512.png', 'public/hub/hyper-hub-icon-v14-512.png'),
  true,
)
assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-icon-v14-512.png',
    'public/teacher/hyper-teacher-icon-v13-512.png',
  ),
  false,
)
assert.equal(
  sameBytes(
    'public/teacher/hyper-teacher-apple-touch-v12-180.png',
    'public/care/hyper-parent-apple-touch-v12-180.png',
  ),
  true,
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
    ['/teacher/hyper-teacher-icon-v14-192.png', '192x192', 'any'],
    ['/teacher/hyper-teacher-icon-v14-512.png', '512x512', 'any'],
    ['/teacher/hyper-teacher-icon-maskable-v14-192.png', '192x192', 'maskable'],
    ['/teacher/hyper-teacher-icon-maskable-v14-512.png', '512x512', 'maskable'],
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
    ['/care/hyper-parent-icon-v14-192.png', '192x192', 'any'],
    ['/care/hyper-parent-icon-v14-512.png', '512x512', 'any'],
    ['/care/hyper-parent-icon-maskable-v14-192.png', '192x192', 'maskable'],
    ['/care/hyper-parent-icon-maskable-v14-512.png', '512x512', 'maskable'],
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
    ['/hub/hyper-hub-icon-v14-192.png', '192x192', 'any'],
    ['/hub/hyper-hub-icon-v14-512.png', '512x512', 'any'],
    ['/hub/hyper-hub-icon-maskable-v14-192.png', '192x192', 'maskable'],
    ['/hub/hyper-hub-icon-maskable-v14-512.png', '512x512', 'maskable'],
  ],
)

assert.match(types, /HUB_ACADEMY_LOGO_WEBP = '\/hub\/hyper-academy-logo-v11\.webp'/)
assert.match(types, /HUB_ACADEMY_LOGO_PNG = '\/hub\/hyper-academy-logo-v11\.png'/)

assert.match(indexHtml, /href="\/teacher\/manifest\.webmanifest"/)
assert.match(indexHtml, /manifest\.href = '\/teacher\/manifest\.webmanifest\?v=10-installable'/)
assert.match(indexHtml, /hyper-teacher-icon-v14-192\.png/)
assert.match(indexHtml, /hyper-parent-icon-v14-192\.png/)
assert.match(indexHtml, /hyper-hub-icon-v14-192\.png/)
assert.match(indexHtml, /hyper-teacher-apple-touch-v12-180\.png/)
assert.match(indexHtml, /hyper-parent-apple-touch-v12-180\.png/)
assert.match(indexHtml, /hyper-hub-apple-touch-v12-180\.png/)

assert.match(teacherRegistrar, /\/teacher\/manifest\.webmanifest\?v=10-installable/)
assert.match(parentRoute, /\/care\/manifest\.webmanifest\?v=10-installable/)
assert.match(hubSession, /\/hub\/manifest\.webmanifest\?v=1-installable/)
assert.match(middleware, /\/care\/manifest\.webmanifest\?v=10-installable/)
assert.match(middleware, /\/hub\/manifest\.webmanifest\?v=1-installable/)

assert.match(teacherLayout, /hyper-teacher-apple-touch-v12-180\.png\?v=12/)
assert.match(parentRegistrar, /hyper-parent-apple-touch-v12-180\.png\?v=12/)
assert.match(parentRegistrar, /MANIFEST_VERSION = '14'/)
assert.match(hubRegistrar, /hyper-hub-apple-touch-v12-180\.png\?v=12/)

assert.match(teacherPush, /hyper-teacher-icon-v14-192\.png/)
assert.match(careSw, /hyper-parent-icon-v14-192\.png/)
assert.match(hubSw, /hyper-hub-icon-v14-192\.png/)
assert.match(careSw, /addEventListener\('push'/)
assert.match(careSw, /notificationclick/)
assert.match(hubSw, /addEventListener\('push'/)
assert.match(hubSw, /notificationclick/)
assert.match(vite, /teacher\/hyper-teacher-icon-192-v5\.png/)
assert.doesNotMatch(vite, /hyper-teacher-icon-v14/)
assert.match(generator, /any === maskable/)
assert.match(generator, /#000000/)

const v14px = await cornerAndExterior('public/teacher/hyper-teacher-icon-v14-512.png')
const v13px = await cornerAndExterior('public/teacher/hyper-teacher-icon-v13-512.png')
assert.deepEqual(v14px.corners, [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
])
assert.equal(v14px.extWhite, 0)
assert.ok(v13px.extWhite > 10000, 'v13 master must still have the white exterior we replaced')

console.log('hyperAcademyLogoV14.test.ts passed')
