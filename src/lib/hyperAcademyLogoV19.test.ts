/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV19.test.ts
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { chromeAdaptiveViewport, MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from '../../scripts/chrome-webapk-icon-spec.mjs'
import { measureSource } from '../../scripts/generate-pwa-icons-v18.mjs'
import { maxFitOneUi, ONE_UI_MASK_INSET, ONE_UI_SUPERELLIPSE_N } from '../../scripts/generate-pwa-icons-v19.mjs'

const teacherManifest = JSON.parse(readFileSync('public/teacher/manifest.webmanifest', 'utf8'))
const parentManifest = JSON.parse(readFileSync('public/care/manifest.webmanifest', 'utf8'))
const hubManifest = JSON.parse(readFileSync('public/hub/manifest.webmanifest', 'utf8'))
const types = readFileSync('src/hub/types.ts', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const teacherLayout = readFileSync('src/components/teacherMobile/TeacherMobileLayout.tsx', 'utf8')
const parentRegistrar = readFileSync('src/components/parent/ParentPwaRegistrar.tsx', 'utf8')
const hubRegistrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
const vite = readFileSync('vite.config.ts', 'utf8')
const generator = readFileSync('scripts/generate-pwa-icons-v19.mjs', 'utf8')
const specSrc = readFileSync('scripts/chrome-webapk-icon-spec.mjs', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V19_FILES = [
  'public/teacher/hyper-teacher-icon-v19-192.png',
  'public/teacher/hyper-teacher-icon-v19-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v19-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v19-512.png',
  'public/care/hyper-parent-icon-v19-192.png',
  'public/care/hyper-parent-icon-v19-512.png',
  'public/care/hyper-parent-icon-maskable-v19-192.png',
  'public/care/hyper-parent-icon-maskable-v19-512.png',
  'public/hub/hyper-hub-icon-v19-192.png',
  'public/hub/hyper-hub-icon-v19-512.png',
  'public/hub/hyper-hub-icon-maskable-v19-192.png',
  'public/hub/hyper-hub-icon-maskable-v19-512.png',
]

const KEPT = [
  'public/hyper-academy-logo-source-v18.png',
  'public/teacher/hyper-teacher-icon-v18-512.png',
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
  'public/teacher/hyper-teacher-icon-v16-512.png',
  'public/teacher/hyper-teacher-icon-v15-512.png',
  'public/hub/hyper-academy-logo-v11.webp',
  'public/hub/hyper-academy-logo-v11.png',
]

for (const file of [...V19_FILES, ...KEPT]) {
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
assert.equal(ONE_UI_MASK_INSET, 8)
assert.match(specSrc, /MASKABLE_SAFE_ZONE_RATIO = 4 \/ 5/)
assert.match(generator, /hyper-academy-logo-source-v18\.png/)
assert.match(generator, /FILL = \{ r: 254, g: 254, b: 254 \}/)
assert.match(generator, /ONE_UI_SUPERELLIPSE_N = 2\.6/)
assert.match(generator, /maxFitOneUi/)
assert.doesNotMatch(generator, /extractLayers/)
assert.doesNotMatch(generator, /composeSpec/)

const measured = await measureSource(readFileSync('public/hyper-academy-logo-source-v18.png'))
assert.deepEqual(measured.bg, { r: 254, g: 254, b: 254, hex: '#fefefe', count: 492948 })
const fit = maxFitOneUi(measured.ink.w, measured.ink.h, spec)
assert.deepEqual(fit, { inset: 52, width: 315, height: 342, left: 99, top: 85 })
assert.ok(fit.height < 408, 'v19 mark must be smaller than v18 408px dest')
assert.ok(fit.width < 376, 'v19 mark must be smaller than v18 376px dest')
assert.ok(Math.abs(fit.left + fit.width / 2 - (spec.origin + spec.viewport / 2)) < 1, 'logo must stay centered')

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

for (const file of V19_FILES) {
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
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v19-512.png', 'public/teacher/hyper-teacher-icon-maskable-v19-512.png'),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v19-192.png', 'public/teacher/hyper-teacher-icon-maskable-v19-192.png'),
  true,
)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v19-512.png', 'public/care/hyper-parent-icon-v19-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v19-512.png', 'public/hub/hyper-hub-icon-v19-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v19-512.png', 'public/teacher/hyper-teacher-icon-v18-512.png'), false)

assert.equal(teacherManifest.id, '/teacher/mobile')
assert.equal(teacherManifest.start_url, '/teacher/mobile')
assert.equal(teacherManifest.scope, '/teacher/')
assert.equal(parentManifest.id, '/care/')
assert.equal(parentManifest.start_url, '/care/')
assert.equal(parentManifest.scope, '/care/')
assert.equal(hubManifest.id, '/hub/')
assert.equal(hubManifest.start_url, '/hub/')
assert.equal(hubManifest.scope, '/hub/')
assert.match(types, /HUB_ACADEMY_LOGO_WEBP = '\/hub\/hyper-academy-logo-v11\.webp'/)
assert.match(indexHtml, /hyper-teacher-apple-touch-v12-180\.png/)
assert.match(teacherLayout, /hyper-teacher-apple-touch-v12-180\.png\?v=12/)
assert.match(parentRegistrar, /hyper-parent-apple-touch-v12-180\.png\?v=12/)
assert.match(hubRegistrar, /hyper-hub-apple-touch-v12-180\.png\?v=12/)
assert.match(careSw, /notificationclick/)
assert.match(hubSw, /notificationclick/)
assert.match(vite, /teacher\/hyper-teacher-icon-192-v5\.png/)
assert.doesNotMatch(vite, /hyper-teacher-icon-v19/)

const v19 = await fieldStats('public/teacher/hyper-teacher-icon-v19-512.png')
assert.deepEqual(v19.corners, [
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
])
assert.equal(v19.exteriorNonField, 0)
assert.ok(v19.minX >= fit.left - 1 && v19.minX <= fit.left + 2, `left ${v19.minX}`)
assert.ok(v19.minY >= fit.top - 1 && v19.minY <= fit.top + 3, `top ${v19.minY}`)
assert.ok(v19.w >= 313 && v19.w <= 315, `ink width ${v19.w}`)
assert.ok(v19.h >= 340 && v19.h <= 342, `ink height ${v19.h}`)
assert.ok(v19.minX >= spec.origin, `left ${v19.minX} outside viewport`)
assert.ok(v19.maxX <= spec.origin + spec.viewport - 1, `right ${v19.maxX} past viewport`)
assert.ok(v19.minY >= spec.origin, `top ${v19.minY} outside viewport`)
assert.ok(v19.maxY <= spec.origin + spec.viewport - 1, `bottom ${v19.maxY} past viewport`)
assert.deepEqual(await cornersOf('public/teacher/hyper-teacher-icon-v19-192.png'), [
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
])

console.log('hyperAcademyLogoV19.test.ts passed', { spec, fit, bbox: [v19.minX, v19.minY, v19.maxX, v19.maxY] })
