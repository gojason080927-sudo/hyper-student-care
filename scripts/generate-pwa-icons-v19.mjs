/**
 * HYPER PWA Android icons v19 — same attached v18 mark, smaller inside #FEFEFE.
 *
 * v18 placed the unmodified source ink box at 376×408 @ (68,52), which is
 * the largest r=20% rounded-rect fit of Chrome's 446 viewport. On a real
 * Galaxy home tile that mark is clipped at the book tops and Korean.
 *
 * Same-device Chrome tile measurement (144×143):
 *   One UI mask ≈ superellipse n=2.6 (r≈0.392 of the tile)
 * v19 keeps the 512 #FEFEFE canvas and the v18 source pixels, and scales
 * the ink box uniformly so its AABB sits inside that n=2.6 mask with an
 * 8px gutter on the 446 viewport. Centered. No restack / recolor.
 *
 * Does not overwrite v12–v18 or iOS apple-touch.
 * Run: node scripts/generate-pwa-icons-v19.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromeAdaptiveViewport } from './chrome-webapk-icon-spec.mjs'
import { measureSource } from './generate-pwa-icons-v18.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SOURCE = join(root, 'public', 'hyper-academy-logo-source-v18.png')
const FILL = { r: 254, g: 254, b: 254 }
export const ONE_UI_SUPERELLIPSE_N = 2.6
export const ONE_UI_MASK_INSET = 8

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v19-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v19-512.png',
  'public/care/hyper-parent-icon-v19-512.png',
  'public/care/hyper-parent-icon-maskable-v19-512.png',
  'public/hub/hyper-hub-icon-v19-512.png',
  'public/hub/hyper-hub-icon-maskable-v19-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v19-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v19-192.png',
  'public/care/hyper-parent-icon-v19-192.png',
  'public/care/hyper-parent-icon-maskable-v19-192.png',
  'public/hub/hyper-hub-icon-v19-192.png',
  'public/hub/hyper-hub-icon-maskable-v19-192.png',
]

export function maxFitOneUi(inkW, inkH, spec) {
  const aspect = inkW / inkH
  const cx = spec.origin + (spec.viewport - 1) / 2
  const cy = spec.origin + (spec.viewport - 1) / 2
  const radius = spec.viewport / 2 - ONE_UI_MASK_INSET
  const n = ONE_UI_SUPERELLIPSE_N
  const inside = (x, y) => {
    const u = (x - cx) / radius
    const v = (y - cy) / radius
    return Math.abs(u) ** n + Math.abs(v) ** n <= 1
  }
  for (let inset = 0; inset <= Math.floor(spec.viewport / 3); inset++) {
    const height = spec.viewport - 2 * inset
    const width = Math.round(aspect * height)
    const left = spec.origin + Math.round((spec.viewport - width) / 2)
    const top = spec.origin + Math.round((spec.viewport - height) / 2)
    const corners = [
      [left, top],
      [left + width - 1, top],
      [left, top + height - 1],
      [left + width - 1, top + height - 1],
    ]
    if (corners.every(([x, y]) => inside(x, y))) {
      return { inset, width, height, left, top }
    }
  }
  throw new Error('no One UI-safe fit')
}

async function compose(srcBuf, size) {
  const spec = chromeAdaptiveViewport(size)
  const measured = await measureSource(srcBuf)
  if (measured.bg.r !== FILL.r || measured.bg.g !== FILL.g || measured.bg.b !== FILL.b) {
    throw new Error(`source background drifted: ${JSON.stringify(measured.bg)}`)
  }
  const fit = maxFitOneUi(measured.ink.w, measured.ink.h, spec)
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
  const fit = maxFitOneUi(measured.ink.w, measured.ink.h, spec)
  const out512 = await compose(src, 512)
  const out192 = await sharp(out512).resize(192, 192).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) throw new Error('v19 must stay opaque RGB')
  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(out512, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v19 any/maskable 512 mismatch')
  }
  console.log(
    JSON.stringify(
      {
        bg: measured.bg,
        ink: measured.ink,
        spec,
        fit,
        vsV18: { width: 376, height: 408, left: 68, top: 52, scale: +(fit.height / 408).toFixed(4) },
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
