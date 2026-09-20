/**
 * 실행: npx tsx src/lib/hyperAcademyLogoV21.test.ts
 *
 * v21 is a candidate only. Manifest / favicon / push / SW stay on v20.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import {
  CANDIDATES,
  FINAL_CLEARANCE,
  FINAL_STROKE,
  inkUnchanged,
  paintRing,
} from '../../scripts/generate-pwa-icons-v21.mjs'

const V20_512 = 'public/teacher/hyper-teacher-icon-v20-512.png'
const V20_192 = 'public/teacher/hyper-teacher-icon-v20-192.png'
const V21_FILES = [
  'public/teacher/hyper-teacher-icon-v21-192.png',
  'public/teacher/hyper-teacher-icon-v21-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v21-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v21-512.png',
  'public/care/hyper-parent-icon-v21-192.png',
  'public/care/hyper-parent-icon-v21-512.png',
  'public/care/hyper-parent-icon-maskable-v21-192.png',
  'public/care/hyper-parent-icon-maskable-v21-512.png',
  'public/hub/hyper-hub-icon-v21-192.png',
  'public/hub/hyper-hub-icon-v21-512.png',
  'public/hub/hyper-hub-icon-maskable-v21-192.png',
  'public/hub/hyper-hub-icon-maskable-v21-512.png',
]

for (const file of V21_FILES) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function identify(path: string) {
  const buf = readFileSync(path)
  return { format: buf.toString('ascii', 1, 4), width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), color: buf[25] }
}

assert.equal(sha256(V20_512), '5e50c425e0696d7d6dd3ac36bcfe6a045c15b3c7c7dcb2954556114e4161d6f3')
assert.equal(sha256('public/teacher/hyper-teacher-apple-touch-v12-180.png'), 'c34d38ebf8c4d9308bce61dc366fd3a1acaca01c4741ee27e277fc7c957e6e31')
assert.notEqual(sha256(V20_512), sha256('public/teacher/hyper-teacher-icon-v21-512.png'))

assert.equal(FINAL_STROKE, 12)
assert.equal(FINAL_CLEARANCE, 2)
assert.deepEqual(
  CANDIDATES.map((c) => [c.stroke, c.clearance]),
  [
    [10, 6],
    [12, 6],
    [10, 2],
    [12, 2],
  ],
)

for (const file of V21_FILES) {
  const meta = identify(file)
  const size = file.includes('512') ? 512 : 192
  assert.equal(meta.format, 'PNG', file)
  assert.equal(meta.width, size, file)
  assert.equal(meta.height, size, file)
  assert.equal(meta.color, 2, `${file} should be opaque RGB`)
}

const teacher512 = readFileSync('public/teacher/hyper-teacher-icon-v21-512.png')
const teacher192 = readFileSync('public/teacher/hyper-teacher-icon-v21-192.png')
assert.equal(Buffer.compare(teacher512, readFileSync('public/teacher/hyper-teacher-icon-maskable-v21-512.png')), 0)
assert.equal(Buffer.compare(teacher512, readFileSync('public/care/hyper-parent-icon-v21-512.png')), 0)
assert.equal(Buffer.compare(teacher512, readFileSync('public/hub/hyper-hub-icon-v21-512.png')), 0)
assert.equal(Buffer.compare(teacher192, readFileSync('public/teacher/hyper-teacher-icon-maskable-v21-192.png')), 0)
assert.equal(Buffer.compare(teacher192, readFileSync('public/care/hyper-parent-icon-v21-192.png')), 0)
assert.equal(Buffer.compare(teacher192, readFileSync('public/hub/hyper-hub-icon-v21-192.png')), 0)

const v20 = readFileSync(V20_512)
const cmp = await inkUnchanged(v20, teacher512)
assert.equal(cmp.inkChanged, 0, `logo pixels changed: ${cmp.inkChanged}`)
assert.ok(cmp.ringPixels > 1000, `ring too small: ${cmp.ringPixels}`)

const expected = await paintRing(v20, FINAL_STROKE, FINAL_CLEARANCE)
assert.equal(Buffer.compare(teacher512, expected), 0)

const scaledRaw = await sharp(expected).resize(192, 192).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const scaled = await sharp(scaledRaw.data, {
  raw: { width: scaledRaw.info.width, height: scaledRaw.info.height, channels: 3 },
})
  .png({ compressionLevel: 9 })
  .toBuffer()
assert.equal(Buffer.compare(teacher192, scaled), 0)

const teacherManifest = readFileSync('public/teacher/manifest.webmanifest', 'utf8')
const parentManifest = readFileSync('public/care/manifest.webmanifest', 'utf8')
const hubManifest = readFileSync('public/hub/manifest.webmanifest', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const teacherPush = readFileSync('public/teacher/push-handlers.js', 'utf8')
const teacherLayout = readFileSync('src/components/teacherMobile/TeacherMobileLayout.tsx', 'utf8')
assert.match(teacherManifest, /hyper-teacher-icon-v20-512\.png/)
assert.doesNotMatch(teacherManifest, /hyper-teacher-icon-v21/)
assert.match(parentManifest, /hyper-parent-icon-v20-512\.png/)
assert.doesNotMatch(parentManifest, /hyper-parent-icon-v21/)
assert.match(hubManifest, /hyper-hub-icon-v20-512\.png/)
assert.doesNotMatch(hubManifest, /hyper-hub-icon-v21/)
assert.match(indexHtml, /v=20-installable/)
assert.doesNotMatch(indexHtml, /v=21-installable/)
assert.match(teacherPush, /hyper-teacher-icon-v20-192\.png/)
assert.match(teacherLayout, /hyper-teacher-icon-v20-192\.png\?v=20/)
assert.match(teacherLayout, /hyper-teacher-apple-touch-v12-180\.png/)
assert.equal(sha256(V20_192), sha256('public/teacher/hyper-teacher-icon-maskable-v20-192.png'))

console.log('hyperAcademyLogoV21.test.ts passed', {
  ringPixels: cmp.ringPixels,
  stroke: FINAL_STROKE,
  clearance: FINAL_CLEARANCE,
})
