/**
 * HYPER PWA Android icons v16
 *
 * v15 inscribed the approved badge at 56.6% so it sat inside Chrome's
 * 80% maskable circle. That left a wide black margin the user rejected.
 *
 * v16 keeps the same black field and the same approved artwork, but
 * composites the tight v12 badge at the canvas size so the logo fills
 * the black square. Rounded-corner leftovers stay #000000.
 * Does not overwrite v12–v15 or iOS apple-touch 97%.
 *
 * Run: node scripts/generate-pwa-icons-v16.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASTER = join(root, 'public', 'teacher', 'hyper-teacher-icon-v12-512.png')
const FILL = { r: 0, g: 0, b: 0 }

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v16-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v16-512.png',
  'public/care/hyper-parent-icon-v16-512.png',
  'public/care/hyper-parent-icon-maskable-v16-512.png',
  'public/hub/hyper-hub-icon-v16-512.png',
  'public/hub/hyper-hub-icon-maskable-v16-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v16-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v16-192.png',
  'public/care/hyper-parent-icon-v16-192.png',
  'public/care/hyper-parent-icon-maskable-v16-192.png',
  'public/hub/hyper-hub-icon-v16-192.png',
  'public/hub/hyper-hub-icon-maskable-v16-192.png',
]

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

async function composeFill(srcBuf, size) {
  const logo = await sharp(srcBuf).resize(size, size, { fit: 'fill' }).png().toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 3, background: FILL },
  })
    .composite([{ input: logo, left: 0, top: 0 }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function assertFillsCanvas(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const at = (x, y) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2]]
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

  let minX = w
  let minY = w
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = at(x, y)
      if (luma(r, g, b) <= 8 && r <= 8 && g <= 8 && b <= 8) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new Error('v16 has no logo pixels')
  const pctW = (maxX - minX + 1) / w
  const pctH = (maxY - minY + 1) / w
  if (pctW < 0.96 || pctH < 0.96) {
    throw new Error(`logo does not fill the black canvas: ${(pctW * 100).toFixed(1)}% x ${(pctH * 100).toFixed(1)}%`)
  }
  if (minX > 8 || minY > 8 || maxX < w - 9 || maxY < w - 9) {
    throw new Error(`logo inset too large: bbox ${minX},${minY}..${maxX},${maxY}`)
  }
  return { pctW, pctH, minX, minY, maxX, maxY }
}

async function main() {
  const src = readFileSync(MASTER)
  const meta = await sharp(src).metadata()
  if (meta.format !== 'png' || meta.width !== 512) {
    throw new Error(`unexpected master ${meta.format} ${meta.width}`)
  }
  const out512 = await composeFill(src, 512)
  const out192 = await composeFill(src, 192)
  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) {
    throw new Error('v16 must stay opaque RGB')
  }
  const fit = await assertFillsCanvas(out512)
  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(out512, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v16 any/maskable 512 mismatch')
  }
  console.log(
    `wrote v16 any===maskable, logo fills black canvas ${(fit.pctW * 100).toFixed(1)}% x ${(fit.pctH * 100).toFixed(1)}%`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
