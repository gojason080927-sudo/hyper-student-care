/**
 * HYPER PWA Android icons v14
 *
 * Keep the v8 rule (opaque + any === maskable) and the approved v12/v13
 * 98% artwork. Only replace the flood-connected exterior white canvas
 * with the black frame color so Galaxy's squircle no longer shows white
 * square corners outside the rounded HYPER frame.
 *
 * Does not overwrite v12/v13 files or iOS apple-touch 97%.
 *
 * Run: node scripts/generate-pwa-icons-v14.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASTER = join(root, 'public', 'teacher', 'hyper-teacher-icon-maskable-v13-512.png')
const EXTERIOR_LUMA = 200
const FILL = { r: 0, g: 0, b: 0 }

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v14-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v14-512.png',
  'public/care/hyper-parent-icon-v14-512.png',
  'public/care/hyper-parent-icon-maskable-v14-512.png',
  'public/hub/hyper-hub-icon-v14-512.png',
  'public/hub/hyper-hub-icon-maskable-v14-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v14-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v14-192.png',
  'public/care/hyper-parent-icon-v14-192.png',
  'public/care/hyper-parent-icon-maskable-v14-192.png',
  'public/hub/hyper-hub-icon-v14-192.png',
  'public/hub/hyper-hub-icon-maskable-v14-192.png',
]

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function floodExteriorToBlack(data, width, height, channels) {
  const seen = new Uint8Array(width * height)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (seen[idx]) return
    const i = idx * channels
    if (luma(data[i], data[i + 1], data[i + 2]) < EXTERIOR_LUMA) return
    seen[idx] = 1
    stack.push(idx)
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  while (stack.length) {
    const idx = stack.pop()
    const x = idx % width
    const y = (idx / width) | 0
    const i = idx * channels
    data[i] = FILL.r
    data[i + 1] = FILL.g
    data[i + 2] = FILL.b
    if (channels === 4) data[i + 3] = 255
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
  const center = (((height / 2) | 0) * width + ((width / 2) | 0))
  if (seen[center]) throw new Error('exterior flood leaked into the logo interior')
  return seen.reduce((sum, bit) => sum + bit, 0)
}

async function main() {
  const src = readFileSync(MASTER)
  const meta = await sharp(src).metadata()
  if (meta.format !== 'png' || meta.width !== 512 || meta.height !== 512) {
    throw new Error(`unexpected master: ${meta.format} ${meta.width}x${meta.height}`)
  }
  if (meta.hasAlpha || meta.channels !== 3) {
    throw new Error('v14 master must be the opaque v13/v12-maskable 98% PNG')
  }

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const filled = floodExteriorToBlack(data, info.width, info.height, info.channels)
  if (filled < 10000) throw new Error(`too few exterior pixels filled: ${filled}`)

  const out512 = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()

  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) {
    throw new Error('v14 512 must stay opaque RGB')
  }

  const out192 = await sharp(out512).resize(192, 192, { kernel: 'lanczos3' }).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  const out192Meta = await sharp(out192).metadata()
  if (out192Meta.hasAlpha || out192Meta.channels !== 3) {
    throw new Error('v14 192 must stay opaque RGB')
  }

  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)

  if (Buffer.compare(readFileSync(join(root, TARGETS_512[0])), readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v14 any/maskable 512 mismatch')
  }
  if (Buffer.compare(readFileSync(join(root, TARGETS_192[0])), readFileSync(join(root, TARGETS_192[1]))) !== 0) {
    throw new Error('v14 any/maskable 192 mismatch')
  }

  console.log(`wrote v14 any===maskable, exterior filled ${filled} px with #000000`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
