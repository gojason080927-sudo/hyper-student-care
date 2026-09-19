/**
 * HYPER PWA Android icons v15
 *
 * Chrome WebAPK maps a maskable PNG onto an Android adaptive icon by
 * keeping only the W3C 80% safe circle (see WebappsIconUtils:
 * MASKABLE_SAFE_ZONE_RATIO = 4/5, then pad to 66/108).
 * v14's gold frame sat at ~97%, so the visible adaptive region was the
 * logo's inner white page — that is the white plate on Galaxy.
 *
 * v15 restores the v8 structure: opaque full-bleed field + artwork
 * inscribed in the 80% circle + OS mask as the only outer shape.
 * Does not overwrite v12/v13/v14 or iOS apple-touch 97%.
 *
 * Run: node scripts/generate-pwa-icons-v15.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASTER = join(root, 'public', 'teacher', 'hyper-teacher-icon-v12-512.png')
const FILL = { r: 0, g: 0, b: 0 }
const SAFE_DIAMETER = 0.8
const SQUARE_FIT = SAFE_DIAMETER / Math.SQRT2

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v15-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v15-512.png',
  'public/care/hyper-parent-icon-v15-512.png',
  'public/care/hyper-parent-icon-maskable-v15-512.png',
  'public/hub/hyper-hub-icon-v15-512.png',
  'public/hub/hyper-hub-icon-maskable-v15-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v15-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v15-192.png',
  'public/care/hyper-parent-icon-v15-192.png',
  'public/care/hyper-parent-icon-maskable-v15-192.png',
  'public/hub/hyper-hub-icon-v15-192.png',
  'public/hub/hyper-hub-icon-maskable-v15-192.png',
]

async function composeSafe(srcBuf, size) {
  const logoSize = Math.round(size * SQUARE_FIT)
  const logo = await sharp(srcBuf).resize(logoSize, logoSize, { fit: 'fill' }).png().toBuffer()
  const left = Math.round((size - logoSize) / 2)
  return sharp({
    create: { width: size, height: size, channels: 3, background: FILL },
  })
    .composite([{ input: logo, left, top: left }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function assertSafeZone(buf, size) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const cx = (w - 1) / 2
  const cy = (w - 1) / 2
  const radius = SAFE_DIAMETER * 0.5 * w
  const half = Math.round(size * SQUARE_FIT) / 2
  const cornerDist = Math.hypot(half, half)
  if (cornerDist > radius + 0.5) {
    throw new Error(`badge square escapes 80% circle: cornerDist=${cornerDist} radius=${radius}`)
  }
  const at = (x, y) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }
  for (const [x, y] of [
    [0, 0],
    [w - 1, 0],
    [0, w - 1],
    [w - 1, w - 1],
  ]) {
    const [r, g, b] = at(x, y)
    if (r !== 0 || g !== 0 || b !== 0) throw new Error(`corner ${x},${y} is not #000000`)
  }
  let nearWhite = 0
  let inner = 0
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.hypot(x - cx, y - cy) > radius) continue
      inner++
      const [r, g, b] = at(x, y)
      if (0.2126 * r + 0.7152 * g + 0.0722 * b > 245) nearWhite++
    }
  }
  const whiteFrac = nearWhite / inner
  if (whiteFrac > 0.28) {
    throw new Error(`inner 80% still looks like a white plate: ${(whiteFrac * 100).toFixed(1)}%`)
  }
}

async function main() {
  const src = readFileSync(MASTER)
  const meta = await sharp(src).metadata()
  if (meta.format !== 'png' || meta.width !== 512) {
    throw new Error(`unexpected master ${meta.format} ${meta.width}`)
  }
  const out512 = await composeSafe(src, 512)
  const out192 = await composeSafe(src, 192)
  await assertSafeZone(out512, 512)
  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) {
    throw new Error('v15 must stay opaque RGB')
  }
  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(out512, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v15 any/maskable 512 mismatch')
  }
  console.log(`wrote v15 any===maskable, square fit ${(SQUARE_FIT * 100).toFixed(1)}% inside 80% circle`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
