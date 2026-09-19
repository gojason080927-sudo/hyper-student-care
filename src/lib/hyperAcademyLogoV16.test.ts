/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV16.test.ts
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { chromeAdaptiveViewport, MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from '../../scripts/chrome-webapk-icon-spec.mjs'

const teacherManifest = JSON.parse(readFileSync('public/teacher/manifest.webmanifest', 'utf8'))
const parentManifest = JSON.parse(readFileSync('public/care/manifest.webmanifest', 'utf8'))
const hubManifest = JSON.parse(readFileSync('public/hub/manifest.webmanifest', 'utf8'))
const types = readFileSync('src/hub/types.ts', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const teacherLayout = readFileSync('src/components/teacherMobile/TeacherMobileLayout.tsx', 'utf8')
const parentRegistrar = readFileSync('src/components/parent/ParentPwaRegistrar.tsx', 'utf8')
const hubRegistrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
const vite = readFileSync('vite.config.ts', 'utf8')
const generator = readFileSync('scripts/generate-pwa-icons-v16.mjs', 'utf8')
const specSrc = readFileSync('scripts/chrome-webapk-icon-spec.mjs', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')

const V16_FILES = [
  'public/teacher/hyper-teacher-icon-v16-192.png',
  'public/teacher/hyper-teacher-icon-v16-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v16-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v16-512.png',
  'public/care/hyper-parent-icon-v16-192.png',
  'public/care/hyper-parent-icon-v16-512.png',
  'public/care/hyper-parent-icon-maskable-v16-192.png',
  'public/care/hyper-parent-icon-maskable-v16-512.png',
  'public/hub/hyper-hub-icon-v16-192.png',
  'public/hub/hyper-hub-icon-v16-512.png',
  'public/hub/hyper-hub-icon-maskable-v16-192.png',
  'public/hub/hyper-hub-icon-maskable-v16-512.png',
]

const KEPT = [
  'public/teacher/hyper-teacher-apple-touch-v12-180.png',
  'public/care/hyper-parent-apple-touch-v12-180.png',
  'public/hub/hyper-hub-apple-touch-v12-180.png',
  'public/teacher/hyper-teacher-icon-v15-512.png',
  'public/teacher/hyper-teacher-icon-v14-512.png',
  'public/hub/hyper-academy-logo-v11.webp',
  'public/hub/hyper-academy-logo-v11.png',
]

for (const file of [...V16_FILES, ...KEPT]) {
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
assert.match(generator, /chromeAdaptiveViewport/)
assert.match(generator, /extractLayers/)
assert.match(generator, /composeSpec/)
assert.doesNotMatch(generator, /fills the black canvas/)

async function fieldStats(path: string) {
  const { data, info } = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const at = (x: number, y: number) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2]] as const
  }
  const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  const corners = [at(0, 0), at(w - 1, 0), at(0, w - 1), at(w - 1, w - 1)]
  let minX = w
  let minY = w
  let maxX = -1
  let maxY = -1
  let extWhite = 0
  let gold = 0
  const seen = new Uint8Array(w * w)
  const stack: number[] = []
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
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = at(x, y)
      if (r > 150 && g > 90 && b < 160 && r > b + 40) gold++
      if (luma(r, g, b) <= 8 && r <= 8 && g <= 8 && b <= 8) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return {
    corners,
    extWhite,
    gold,
    pctW: (maxX - minX + 1) / w,
    pctH: (maxY - minY + 1) / w,
    minX,
    minY,
    maxX,
    maxY,
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

for (const file of V16_FILES) {
  const meta = identify(file)
  const size = file.includes('512') ? 512 : 192
  assert.equal(meta.format, 'PNG', file)
  assert.equal(meta.width, size, file)
  assert.equal(meta.height, size, file)
  assert.equal(meta.color, 2, `${file} should be opaque RGB`)
}

assert.equal(sha256('public/teacher/hyper-teacher-apple-touch-v12-180.png'), 'c34d38ebf8c4d9308bce61dc366fd3a1acaca01c4741ee27e277fc7c957e6e31')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v15-512.png'), '9511201b77fc3563e7ea1a913d9a09b223a7f460c55d4122ff59cff7c7c14419')
assert.equal(sha256('public/teacher/hyper-teacher-icon-v16-512.png'), '86d19447b385eec1a5112655739e97625a189c021f4274d88e7221645b06fa26')
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v16-512.png', 'public/teacher/hyper-teacher-icon-maskable-v16-512.png'),
  true,
)
assert.equal(
  sameBytes('public/teacher/hyper-teacher-icon-v16-192.png', 'public/teacher/hyper-teacher-icon-maskable-v16-192.png'),
  true,
)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v16-512.png', 'public/care/hyper-parent-icon-v16-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v16-512.png', 'public/hub/hyper-hub-icon-v16-512.png'), true)
assert.equal(sameBytes('public/teacher/hyper-teacher-icon-v16-512.png', 'public/teacher/hyper-teacher-icon-v15-512.png'), false)

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
assert.doesNotMatch(vite, /hyper-teacher-icon-v16/)

const v16 = await fieldStats('public/teacher/hyper-teacher-icon-v16-512.png')
const v15 = await fieldStats('public/teacher/hyper-teacher-icon-v15-512.png')
assert.deepEqual(v16.corners, [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
])
assert.equal(v16.extWhite, 0)
assert.ok(v16.gold > 8000, `gold frame missing, got ${v16.gold}`)
assert.ok(v16.minX >= spec.origin - 2 && v16.minX <= spec.origin + 16, `frame left ${v16.minX} vs origin ${spec.origin}`)
assert.ok(v16.maxX >= spec.origin + spec.viewport - 16 && v16.maxX <= spec.origin + spec.viewport + 2, `frame right ${v16.maxX}`)
assert.ok(v16.pctW > 0.8 && v16.pctW < 0.92, `artwork must track the 446 viewport, not 100% canvas, got ${v16.pctW}`)
assert.ok(v16.pctH > 0.8 && v16.pctH < 0.92, `artwork must track the 446 viewport, not 100% canvas, got ${v16.pctH}`)
assert.ok(v15.pctW < 0.7, 'v15 must remain the small-badge Production version')
assert.ok((await pixelDiff('public/teacher/hyper-teacher-icon-v16-512.png', 'public/teacher/hyper-teacher-icon-v12-512.png')) > 0.4)
assert.ok((await pixelDiff('public/teacher/hyper-teacher-icon-v16-512.png', 'public/teacher/hyper-teacher-icon-v15-512.png')) > 0.2)

console.log('hyperAcademyLogoV16.test.ts passed', { spec, bbox: [v16.minX, v16.minY, v16.maxX, v16.maxY], pct: [v16.pctW, v16.pctH] })
