/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV20.test.ts
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { chromeAdaptiveViewport, MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from '../../scripts/chrome-webapk-icon-spec.mjs'
import { measureSource } from '../../scripts/generate-pwa-icons-v18.mjs'
import {
  BOOK_MIN_GAP_N26,
  KOREAN_MIN_GAP_N24,
  KOREAN_MIN_GAP_N26,
  maxFitKoreanFirst,
  measureBands,
  minBandGap,
  mapBox,
  ONE_UI_SUPERELLIPSE_N,
} from '../../scripts/generate-pwa-icons-v20.mjs'

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
const generator = readFileSync('scripts/generate-pwa-icons-v20.mjs', 'utf8')
const specSrc = readFileSync('scripts/chrome-webapk-icon-spec.mjs', 'utf8')
const teacherPush = readFileSync('public/teacher/push-handlers.js', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V20_FILES = [
  'public/teacher/hyper-teacher-icon-v20-192.png',
  'public/teacher/hyper-teacher-icon-v20-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v20-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v20-512.png',
  'public/care/hyper-parent-icon-v20-192.png',
  'public/care/hyper-parent-icon-v20-512.png',
  'public/care/hyper-parent-icon-maskable-v20-192.png',
  'public/care/hyper-parent-icon-maskable-v20-512.png',
  'public/hub/hyper-hub-icon-v20-192.png',
  'public/hub/hyper-hub-icon-v20-512.png',
  'public/hub/hyper-hub-icon-maskable-v20-192.png',
  'public/hub/hyper-hub-icon-maskable-v20-512.png',
]

const KEPT = [
  'public/hyper-academy-logo-source-v18.png',
  'public/teacher/hyper-teacher-icon-v18-512.png',
  'public/teacher/hyper-teacher-icon-v19-512.png',
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
  'public/teacher/hyper-teacher-icon-v16-512.png',
  'public/teacher/hyper-teacher-icon-v15-512.png',
  'public/hub/hyper-academy-logo-v11.webp',
  'public/hub/hyper-academy-logo-v11.png',
]

for (const file of [...V20_FILES, ...KEPT]) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

function identify(path: string) {
  const buf = readFileSync(path)
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    return { format: 'PNG', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), color: buf[25] }
  }
  throw new Error(`unsupported image header in ${path}`)
}

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function sameBytes(a: string, b: string) {
  return readFileSync(a).equals(readFileSync(b))
}

const padding = Math.round(MASKABLE_ICON_PADDING_RATIO * 512)
const padded = 512 + 2 * padding
const viewport = (padded * VIEW_PORT_SCALE) | 0
const spec = chromeAdaptiveViewport(512)
assert.equal(padding, 79)
assert.equal(padded, 670)
assert.equal(viewport, 446)
assert.deepEqual(spec, { padding: 79, padded: 670, paddedOrigin: 112, viewport: 446, origin: 33 })
assert.equal(ONE_UI_SUPERELLIPSE_N, 2.6)
assert.equal(KOREAN_MIN_GAP_N26, 36)
assert.equal(KOREAN_MIN_GAP_N24, 12)
assert.equal(BOOK_MIN_GAP_N26, 16)
assert.match(specSrc, /MASKABLE_SAFE_ZONE_RATIO = 4 \/ 5/)
assert.match(generator, /hyper-academy-logo-source-v18\.png/)
assert.match(generator, /FILL = \{ r: 254, g: 254, b: 254 \}/)
assert.match(generator, /maxFitKoreanFirst/)
assert.match(generator, /KOREAN_MIN_GAP_N26 = 36/)
assert.doesNotMatch(generator, /extractLayers/)
assert.doesNotMatch(generator, /composeSpec/)

const measured = await measureSource(readFileSync('public/hyper-academy-logo-source-v18.png'))
assert.deepEqual(measured.bg, { r: 254, g: 254, b: 254, hex: '#fefefe', count: 492948 })
const bands = await measureBands(readFileSync('public/hyper-academy-logo-source-v18.png'), measured.ink)
assert.deepEqual(bands.korean.rel, { minX: 69, minY: 947, maxX: 844, maxY: 1012 })
const fit = maxFitKoreanFirst(measured.ink.w, measured.ink.h, bands.korean.rel, bands.books.rel, spec)
assert.deepEqual(
  { width: fit.width, height: fit.height, left: fit.left, top: fit.top },
  { width: 293, height: 318, left: 110, top: 97 },
)
assert.ok(fit.height < 342, 'v20 mark must be smaller than v19 342px dest')
assert.ok(fit.width < 315, 'v20 mark must be smaller than v19 315px dest')
assert.ok(fit.koreanGapN26 >= KOREAN_MIN_GAP_N26, `korean n=2.6 gap ${fit.koreanGapN26}`)
assert.ok(fit.koreanGapN24 >= KOREAN_MIN_GAP_N24, `korean n=2.4 gap ${fit.koreanGapN24}`)
assert.ok(fit.booksGapN26 >= BOOK_MIN_GAP_N26, `books n=2.6 gap ${fit.booksGapN26}`)
assert.ok(Math.abs(fit.left + fit.width / 2 - (spec.origin + spec.viewport / 2)) < 1, 'logo must stay centered')

const koreanBox = mapBox(bands.korean.rel, fit)
assert.ok(minBandGap(koreanBox, spec, 2.6) >= 36)

async function cornersOf(path: string) {
  const { data, info } = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const at = (x: number, y: number) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2]] as const
  }
  return [at(0, 0), at(w - 1, 0), at(0, w - 1), at(w - 1, w - 1)]
}

async function fieldStats(path: string) {
  const { data, info } = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const at = (x: number, y: number) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2]] as const
  }
  const isField = (r: number, g: number, b: number) => r >= 248 && g >= 248 && b >= 248
  let minX = w
  let minY = w
  let maxX = -1
  let maxY = -1
  let exteriorNonField = 0
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = at(x, y)
      if (isField(r, g, b)) continue
      if (x === 0 || y === 0 || x === w - 1 || y === w - 1) exteriorNonField++
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return {
    corners: [at(0, 0), at(w - 1, 0), at(0, w - 1), at(w - 1, w - 1)],
    exteriorNonField,
    minX,
    minY,
    maxX,
    maxY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  }
}

for (const file of V20_FILES) {
  const meta = identify(file)
  const size = file.includes('512') ? 512 : 192
  assert.equal(meta.format, 'PNG', file)
  assert.equal(meta.width, size, file)
  assert.equal(meta.height, size, file)
  assert.equal(meta.color, 2, `${file} should be opaque RGB`)
}

assert.equal(sha256('public/hyper-academy-logo-source-v18.png'), 'a129f1e8f6f6efb839f7275d75dd75891bd5f8e393586cb332c26f80076eb289')
assert.equal(sha256('public/teacher/hyper-teacher-apple-touch-v12-180.png'), 'c34d38ebf8c4d9308bce61dc366fd3a1acaca01c4741ee27e277fc7c957e6e31')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v15-512.png'), '9511201b77fc3563e7ea1a913d9a09b223a7f460c55d4122ff59cff7c7c14419')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v16-512.png'), '86d19447b385eec1a5112655739e97625a189c021f4274d88e7221645b06fa26')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v18-512.png'), '7f9be7dbfca2f65a1427feaa0716a9abc7471f96bc023bddd83b94b35540f621')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v19-512.png'), 'bdbfe4698262e6eea8e2b5728c46f049c5fe102200c144ed9ab4a51deb1e4ad0')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v20-512.png'), '5e50c425e0696d7d6dd3ac36bcfe6a045c15b3c7c7dcb2954556114e4161d6f3')
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v20-512.png', 'public/teacher/hyper-teacher-icon-maskable-v20-512.png'),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v20-192.png', 'public/teacher/hyper-teacher-icon-maskable-v20-192.png'),
  true,
)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v20-512.png', 'public/care/hyper-parent-icon-v20-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v20-512.png', 'public/hub/hyper-hub-icon-v20-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v20-512.png', 'public/teacher/hyper-teacher-icon-v18-512.png'), false)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v20-512.png', 'public/teacher/hyper-teacher-icon-v19-512.png'), false)

assert.equal(teacherManifest.id, '/teacher/mobile')
assert.equal(teacherManifest.start_url, '/teacher/mobile')
assert.equal(teacherManifest.scope, '/teacher/')
assert.deepEqual(
  teacherManifest.icons.map((icon: { src: string; sizes: string; purpose: string }) => [icon.src, icon.sizes, icon.purpose]),
  [
    ['/teacher/hyper-teacher-icon-v21-192.png', '192x192', 'any'],
    ['/teacher/hyper-teacher-icon-v21-512.png', '512x512', 'any'],
    ['/teacher/hyper-teacher-icon-maskable-v21-192.png', '192x192', 'maskable'],
    ['/teacher/hyper-teacher-icon-maskable-v21-512.png', '512x512', 'maskable'],
  ],
)
assert.equal(parentManifest.id, '/care/')
assert.equal(parentManifest.start_url, '/care/')
assert.equal(parentManifest.scope, '/care/')
assert.equal(hubManifest.id, '/hub/')
assert.equal(hubManifest.start_url, '/hub/')
assert.equal(hubManifest.scope, '/hub/')
assert.deepEqual(
  parentManifest.icons.map((icon: { src: string; purpose: string }) => [icon.src, icon.purpose]),
  [
    ['/care/hyper-parent-icon-v21-192.png', 'any'],
    ['/care/hyper-parent-icon-v21-512.png', 'any'],
    ['/care/hyper-parent-icon-maskable-v21-192.png', 'maskable'],
    ['/care/hyper-parent-icon-maskable-v21-512.png', 'maskable'],
  ],
)
assert.deepEqual(
  hubManifest.icons.map((icon: { src: string; purpose: string }) => [icon.src, icon.purpose]),
  [
    ['/hub/hyper-hub-icon-v21-192.png', 'any'],
    ['/hub/hyper-hub-icon-v21-512.png', 'any'],
    ['/hub/hyper-hub-icon-maskable-v21-192.png', 'maskable'],
    ['/hub/hyper-hub-icon-maskable-v21-512.png', 'maskable'],
  ],
)

assert.match(types, /HUB_ACADEMY_LOGO_WEBP = '\/hub\/hyper-academy-logo-v11\.webp'/)
assert.match(indexHtml, /manifest\.href = '\/teacher\/manifest\.webmanifest\?v=21-installable'/)
assert.match(indexHtml, /hyper-teacher-icon-v21-192\.png/)
assert.match(indexHtml, /hyper-teacher-apple-touch-v12-180\.png/)
assert.doesNotMatch(indexHtml, /hyper-teacher-icon-v20-192\.png/)
assert.doesNotMatch(indexHtml, /hyper-teacher-icon-v19-192\.png/)
assert.doesNotMatch(indexHtml, /hyper-teacher-icon-v18-192\.png/)
assert.match(teacherRegistrar, /\/teacher\/manifest\.webmanifest\?v=21-installable/)
assert.match(parentRoute, /\/care\/manifest\.webmanifest\?v=21-installable/)
assert.match(hubSession, /\/hub\/manifest\.webmanifest\?v=21-installable/)
assert.match(middleware, /\/care\/manifest\.webmanifest\?v=21-installable/)
assert.match(middleware, /\/hub\/manifest\.webmanifest\?v=21-installable/)
assert.match(teacherLayout, /hyper-teacher-apple-touch-v12-180\.png\?v=12/)
assert.match(teacherLayout, /hyper-teacher-icon-v21-192\.png\?v=21/)
assert.match(parentRegistrar, /hyper-parent-apple-touch-v12-180\.png\?v=12/)
assert.match(parentRegistrar, /MANIFEST_VERSION = '21'/)
assert.match(hubRegistrar, /hyper-hub-apple-touch-v12-180\.png\?v=12/)
assert.match(hubRegistrar, /hyper-hub-icon-v21-192\.png\?v=21/)
assert.match(teacherPush, /hyper-teacher-icon-v21-192\.png/)
assert.match(careSw, /hyper-parent-icon-v21-192\.png/)
assert.match(hubSw, /hyper-hub-icon-v21-192\.png/)
assert.match(careSw, /notificationclick/)
assert.match(hubSw, /notificationclick/)
assert.match(vite, /teacher\/hyper-teacher-icon-192-v5\.png/)
assert.doesNotMatch(vite, /hyper-teacher-icon-v20/)

const v20 = await fieldStats('public/teacher/hyper-teacher-icon-v20-512.png')
assert.deepEqual(v20.corners, [
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
])
assert.equal(v20.exteriorNonField, 0)
assert.ok(v20.minX >= fit.left - 1 && v20.minX <= fit.left + 2, `left ${v20.minX}`)
assert.ok(v20.minY >= fit.top - 1 && v20.minY <= fit.top + 3, `top ${v20.minY}`)
assert.ok(v20.w >= 291 && v20.w <= 293, `ink width ${v20.w}`)
assert.ok(v20.h >= 316 && v20.h <= 318, `ink height ${v20.h}`)
assert.ok(v20.minX >= spec.origin, `left ${v20.minX} outside viewport`)
assert.ok(v20.maxX <= spec.origin + spec.viewport - 1, `right ${v20.maxX} past viewport`)
assert.ok(v20.minY >= spec.origin, `top ${v20.minY} outside viewport`)
assert.ok(v20.maxY <= spec.origin + spec.viewport - 1, `bottom ${v20.maxY} past viewport`)
assert.deepEqual(await cornersOf('public/teacher/hyper-teacher-icon-v20-192.png'), [
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
])

console.log('hyperAcademyLogoV20.test.ts passed', { spec, fit, bbox: [v20.minX, v20.minY, v20.maxX, v20.maxY] })
