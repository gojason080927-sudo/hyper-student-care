/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV18.test.ts
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { chromeAdaptiveViewport, MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from '../../scripts/chrome-webapk-icon-spec.mjs'
import { maxFitInViewport, measureSource } from '../../scripts/generate-pwa-icons-v18.mjs'

const teacherManifest = JSON.parse(readFileSync('public/teacher/manifest.webmanifest', 'utf8'))
const parentManifest = JSON.parse(readFileSync('public/care/manifest.webmanifest', 'utf8'))
const hubManifest = JSON.parse(readFileSync('public/hub/manifest.webmanifest', 'utf8'))
const types = readFileSync('src/hub/types.ts', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const teacherLayout = readFileSync('src/components/teacherMobile/TeacherMobileLayout.tsx', 'utf8')
const parentRegistrar = readFileSync('src/components/parent/ParentPwaRegistrar.tsx', 'utf8')
const hubRegistrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
const vite = readFileSync('vite.config.ts', 'utf8')
const generator = readFileSync('scripts/generate-pwa-icons-v18.mjs', 'utf8')
const specSrc = readFileSync('scripts/chrome-webapk-icon-spec.mjs', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V18_FILES = [
  'public/teacher/hyper-teacher-icon-v18-192.png',
  'public/teacher/hyper-teacher-icon-v18-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v18-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v18-512.png',
  'public/care/hyper-parent-icon-v18-192.png',
  'public/care/hyper-parent-icon-v18-512.png',
  'public/care/hyper-parent-icon-maskable-v18-192.png',
  'public/care/hyper-parent-icon-maskable-v18-512.png',
  'public/hub/hyper-hub-icon-v18-192.png',
  'public/hub/hyper-hub-icon-v18-512.png',
  'public/hub/hyper-hub-icon-maskable-v18-192.png',
  'public/hub/hyper-hub-icon-maskable-v18-512.png',
]

const KEPT = [
  'public/hyper-academy-logo-source-v18.png',
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
  'public/teacher/hyper-teacher-icon-v16-512.png',
  'public/teacher/hyper-teacher-icon-v15-512.png',
  'public/teacher/hyper-teacher-icon-v14-512.png',
  'public/hub/hyper-academy-logo-v11.webp',
  'public/hub/hyper-academy-logo-v11.png',
]

for (const file of [...V18_FILES, ...KEPT]) {
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
assert.match(specSrc, /MASKABLE_SAFE_ZONE_RATIO = 4 \/ 5/)
assert.match(specSrc, /ADAPTIVE_SAFE_ZONE_RATIO = 66 \/ 108/)
assert.match(specSrc, /DEFAULT_VIEW_PORT_SCALE/)
assert.match(generator, /hyper-academy-logo-source-v18\.png/)
assert.match(generator, /FILL = \{ r: 254, g: 254, b: 254 \}/)
assert.match(generator, /measureSource/)
assert.match(generator, /maxFitInViewport/)
assert.match(generator, /chromeAdaptiveViewport/)
assert.doesNotMatch(generator, /extractLayers/)
assert.doesNotMatch(generator, /composeSpec/)
assert.doesNotMatch(generator, /fills the black canvas/)

const measured = await measureSource(readFileSync('public/hyper-academy-logo-source-v18.png'))
assert.deepEqual(measured.bg, { r: 254, g: 254, b: 254, hex: '#fefefe', count: 492948 })
assert.deepEqual(measured.ink, { minX: 164, minY: 111, maxX: 1100, maxY: 1127, w: 937, h: 1017 })
const fit = maxFitInViewport(measured.ink.w, measured.ink.h, spec)
assert.deepEqual(fit, { inset: 19, width: 376, height: 408, left: 68, top: 52 })

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
  const seen = new Uint8Array(w * w)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= w) return
    const idx = y * w + x
    if (seen[idx]) return
    const i = idx * ch
    if (!isField(data[i], data[i + 1], data[i + 2])) return
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
    const x = idx % w
    const y = (idx / w) | 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = at(x, y)
      if (isField(r, g, b)) continue
      if (!seen[y * w + x] && (x === 0 || y === 0 || x === w - 1 || y === w - 1)) exteriorNonField++
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

async function pixelDiff(a: string, b: string) {
  const left = await sharp(readFileSync(a)).resize(512, 512).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const right = await sharp(readFileSync(b)).resize(512, 512).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let diff = 0
  for (let i = 0; i < left.data.length; i += left.info.channels) {
    if (
      Math.abs(left.data[i] - right.data[i]) +
        Math.abs(left.data[i + 1] - right.data[i + 1]) +
        Math.abs(left.data[i + 2] - right.data[i + 2]) >
      30
    ) {
      diff++
    }
  }
  return diff / (512 * 512)
}

for (const file of V18_FILES) {
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
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v18-512.png', 'public/teacher/hyper-teacher-icon-maskable-v18-512.png'),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v18-192.png', 'public/teacher/hyper-teacher-icon-maskable-v18-192.png'),
  true,
)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v18-512.png', 'public/care/hyper-parent-icon-v18-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v18-512.png', 'public/hub/hyper-hub-icon-v18-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v18-512.png', 'public/teacher/hyper-teacher-icon-v16-512.png'), false)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v18-512.png', 'public/teacher/hyper-teacher-icon-v15-512.png'), false)

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
assert.doesNotMatch(vite, /hyper-teacher-icon-v18/)

const v18 = await fieldStats('public/teacher/hyper-teacher-icon-v18-512.png')
assert.deepEqual(v18.corners, [
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
])
assert.equal(v18.exteriorNonField, 0)
assert.equal(v18.minX, 68)
assert.ok(v18.minY >= 52 && v18.minY <= 54, `ink top ${v18.minY}`)
assert.equal(v18.w, 376)
assert.ok(v18.h >= 406 && v18.h <= 408, `ink height ${v18.h}`)
assert.ok(v18.minX >= spec.origin, `left ${v18.minX} outside viewport origin ${spec.origin}`)
assert.ok(v18.maxX <= spec.origin + spec.viewport - 1, `right ${v18.maxX} past viewport`)
assert.ok(v18.minY >= spec.origin, `top ${v18.minY} outside viewport origin ${spec.origin}`)
assert.ok(v18.maxY <= spec.origin + spec.viewport - 1, `bottom ${v18.maxY} past viewport`)
assert.deepEqual(await cornersOf('public/teacher/hyper-teacher-icon-v18-192.png'), [
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
  [254, 254, 254],
])
assert.ok((await pixelDiff('public/teacher/hyper-teacher-icon-v18-512.png', 'public/teacher/hyper-teacher-icon-v16-512.png')) > 0.4)
assert.ok((await pixelDiff('public/teacher/hyper-teacher-icon-v18-512.png', 'public/teacher/hyper-teacher-icon-v15-512.png')) > 0.4)

console.log('hyperAcademyLogoV18.test.ts passed', { spec, fit, bbox: [v18.minX, v18.minY, v18.maxX, v18.maxY] })
