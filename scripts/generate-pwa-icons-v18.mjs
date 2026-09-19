/**
 * HYPER PWA Android icons v18 — attached source, unmodified mark.
 *
 * Background is the measured mode/median of the attached PNG:
 *   RGB(254, 254, 254) = #FEFEFE
 * The mark is not restacked or recolored. The source ink box is
 * scaled uniformly into Chrome's Galaxy viewport [33,33]–[478,478]
 * at the largest size that stays inside the One UI r=20% squircle.
 *
 * Does not overwrite v12–v17 or iOS apple-touch.
 * Run: node scripts/generate-pwa-icons-v18.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromeAdaptiveViewport } from './chrome-webapk-icon-spec.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SOURCE = join(root, 'public', 'hyper-academy-logo-source-v18.png')
const FILL = { r: 254, g: 254, b: 254 }

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v18-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v18-512.png',
  'public/care/hyper-parent-icon-v18-512.png',
  'public/care/hyper-parent-icon-maskable-v18-512.png',
  'public/hub/hyper-hub-icon-v18-512.png',
  'public/hub/hyper-hub-icon-maskable-v18-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v18-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v18-192.png',
  'public/care/hyper-parent-icon-v18-192.png',
  'public/care/hyper-parent-icon-maskable-v18-192.png',
  'public/hub/hyper-hub-icon-v18-192.png',
  'public/hub/hyper-hub-icon-maskable-v18-192.png',
]

function isBackground(r, g, b, a) {
  return a < 16 || (r >= 248 && g >= 248 && b >= 248)
}

export async function measureSource(srcBuf) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const ch = info.channels
  const counts = new Map()
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (isBackground(r, g, b, a)) {
        const key = `${r},${g},${b}`
        counts.set(key, (counts.get(key) || 0) + 1)
        continue
      }
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const [mr, mg, mb] = mode[0].split(',').map(Number)
  return {
    width: w,
    height: h,
    bg: { r: mr, g: mg, b: mb, hex: `#${[mr, mg, mb].map((v) => v.toString(16).padStart(2, '0')).join('')}`, count: mode[1] },
    ink: { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 },
  }
}

function squircleAvailWidth(y, origin, viewport) {
  const r = 0.2 * viewport
  const top = origin
  const bot = origin + viewport - 1
  if (y < top || y > bot) return 0
  if (y < origin + r) {
    const dy = y - (origin + r)
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy))
    return origin + viewport - 1 - r + dx - (origin + r - dx)
  }
  if (y > origin + viewport - 1 - r) {
    const dy = y - (origin + viewport - 1 - r)
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy))
    return origin + viewport - 1 - r + dx - (origin + r - dx)
  }
  return viewport
}

export function maxFitInViewport(inkW, inkH, spec) {
  const aspect = inkW / inkH
  for (let inset = 0; inset <= Math.floor(spec.viewport / 4); inset++) {
    const destH = spec.viewport - 2 * inset
    const destW = aspect * destH
    const y0 = spec.origin + inset
    const y1 = spec.origin + spec.viewport - 1 - inset
    if (destW <= squircleAvailWidth(y0, spec.origin, spec.viewport) + 0.01 && destW <= squircleAvailWidth(y1, spec.origin, spec.viewport) + 0.01) {
      const width = Math.round(destW)
      const height = destH
      const left = spec.origin + Math.round((spec.viewport - width) / 2)
      const top = y0
      return { inset, width, height, left, top }
    }
  }
  throw new Error('no squircle-safe fit')
}

async function compose(srcBuf, size) {
  const spec = chromeAdaptiveViewport(size)
  const measured = await measureSource(srcBuf)
  if (measured.bg.r !== FILL.r || measured.bg.g !== FILL.g || measured.bg.b !== FILL.b) {
    throw new Error(`source background drifted: ${JSON.stringify(measured.bg)}`)
  }
  const fit = maxFitInViewport(measured.ink.w, measured.ink.h, spec)
  const crop = await sharp(srcBuf)
    .extract({
      left: measured.ink.minX,
      top: measured.ink.minY,
      width: measured.ink.w,
      height: measured.ink.h,
    })
    .png()
    .toBuffer()
  const placed = await sharp(crop).resize(fit.width, fit.height, { fit: 'fill' }).png().toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 3, background: FILL },
  })
    .composite([{ input: placed, left: fit.left, top: fit.top }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  const src = readFileSync(SOURCE)
  const measured = await measureSource(src)
  const spec = chromeAdaptiveViewport(512)
  if (spec.padding !== 79 || spec.padded !== 670 || spec.viewport !== 446 || spec.origin !== 33) {
    throw new Error(`Chrome 512 integer path drifted: ${JSON.stringify(spec)}`)
  }
  const fit = maxFitInViewport(measured.ink.w, measured.ink.h, spec)
  const out512 = await compose(src, 512)
  const out192 = await sharp(out512).resize(192, 192).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) throw new Error('v18 must stay opaque RGB')
  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(out512, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v18 any/maskable 512 mismatch')
  }
  console.log(
    JSON.stringify(
      {
        bg: measured.bg,
        ink: measured.ink,
        spec,
        fit,
      },
      null,
      2,
    ),
  )
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
