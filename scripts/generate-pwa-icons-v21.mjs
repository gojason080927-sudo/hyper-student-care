/**
 * HYPER PWA Android icons v21 — v20 canvas + One UI n=2.6 inner ring.
 *
 * Does not overwrite v20 or apple-touch. Does not rewrite manifests.
 * 6px inward clearance leaves a visible white halo at the One UI mask
 * (the wallpaper still meets #FEFEFE). 2px clearance keeps the black ring
 * as the tile edge without clipping on n=2.6 or n=2.4. 12px stroke reads
 * on a ~144px Galaxy tile; 10px is too faint at 48dp.
 *
 * Run: node scripts/generate-pwa-icons-v21.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromeAdaptiveViewport } from './chrome-webapk-icon-spec.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

export const ONE_UI_SUPERELLIPSE_N = 2.6
export const RING_FILL = { r: 0, g: 0, b: 0 }
export const FIELD = { r: 254, g: 254, b: 254 }

/** Official candidate after preview compare. */
export const FINAL_STROKE = 12
export const FINAL_CLEARANCE = 2

export const CANDIDATES = [
  { id: '10-c6', stroke: 10, clearance: 6 },
  { id: '12-c6', stroke: 12, clearance: 6 },
  { id: '10-c2', stroke: 10, clearance: 2 },
  { id: '12-c2', stroke: 12, clearance: 2 },
]

const V20_512 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v20-512.png')

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v21-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v21-512.png',
  'public/care/hyper-parent-icon-v21-512.png',
  'public/care/hyper-parent-icon-maskable-v21-512.png',
  'public/hub/hyper-hub-icon-v21-512.png',
  'public/hub/hyper-hub-icon-maskable-v21-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v21-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v21-192.png',
  'public/care/hyper-parent-icon-v21-192.png',
  'public/care/hyper-parent-icon-maskable-v21-192.png',
  'public/hub/hyper-hub-icon-v21-192.png',
  'public/hub/hyper-hub-icon-maskable-v21-192.png',
]

export function superellipsePath(cx, cy, a, b, n) {
  const steps = 360
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(3)},${y.toFixed(3)}`)
  }
  return `${pts.join(' ')} Z`
}

export function ringSpec(size = 512) {
  const spec = chromeAdaptiveViewport(size)
  const cx = spec.origin + spec.viewport / 2
  const cy = spec.origin + spec.viewport / 2
  const maskRadius = spec.viewport / 2
  return { spec, cx, cy, maskRadius, n: ONE_UI_SUPERELLIPSE_N }
}

export function ringSvg(size, stroke, clearance) {
  const { cx, cy, maskRadius, n } = ringSpec(size)
  const pathR = maskRadius - clearance - stroke / 2
  if (pathR <= 0) throw new Error('ring radius collapsed')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <path d="${superellipsePath(cx, cy, pathR, pathR, n)}" fill="none" stroke="rgb(0,0,0)" stroke-width="${stroke}" stroke-linejoin="round"/>
</svg>`
}

export async function paintRing(srcBuf, stroke, clearance) {
  const meta = await sharp(srcBuf).metadata()
  const size = meta.width
  const svg = Buffer.from(ringSvg(size, stroke, clearance))
  const overlay = await sharp(srcBuf)
    .ensureAlpha()
    .composite([{ input: svg, blend: 'over' }])
    .png()
    .toBuffer()
  const { data, info } = await sharp(overlay).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.channels !== 3) throw new Error(`raw channels ${info.channels}`)
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

export async function inkUnchanged(beforeBuf, afterBuf) {
  const a = await sharp(beforeBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const b = await sharp(afterBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    throw new Error('size mismatch')
  }
  const ch = a.info.channels
  let inkChanged = 0
  let ringPixels = 0
  let maxInkDelta = 0
  for (let i = 0; i < a.data.length; i += ch) {
    const ar = a.data[i]
    const ag = a.data[i + 1]
    const ab = a.data[i + 2]
    const br = b.data[i]
    const bg = b.data[i + 1]
    const bb = b.data[i + 2]
    const wasField = ar >= 248 && ag >= 248 && ab >= 248
    const same = ar === br && ag === bg && ab === bb
    if (!same) {
      ringPixels += 1
      if (!wasField) {
        inkChanged += 1
        maxInkDelta = Math.max(maxInkDelta, Math.abs(ar - br), Math.abs(ag - bg), Math.abs(ab - bb))
      }
    }
  }
  return { inkChanged, ringPixels, maxInkDelta, total: a.info.width * a.info.height }
}

async function main() {
  const spec = chromeAdaptiveViewport(512)
  if (spec.padding !== 79 || spec.viewport !== 446 || spec.origin !== 33) {
    throw new Error(`Chrome 512 path drifted: ${JSON.stringify(spec)}`)
  }
  const v20 = readFileSync(V20_512)
  const previewDir = join(root, 'public', '_preview-v21')
  mkdirSync(previewDir, { recursive: true })

  const stats = []
  for (const candidate of CANDIDATES) {
    const out = await paintRing(v20, candidate.stroke, candidate.clearance)
    const cmp = await inkUnchanged(v20, out)
    writeFileSync(join(previewDir, `ring-${candidate.id}-512.png`), out)
    stats.push({ ...candidate, ...cmp })
    if (cmp.inkChanged !== 0) {
      throw new Error(`${candidate.id} painted over non-field logo pixels (${cmp.inkChanged})`)
    }
  }

  const final = await paintRing(v20, FINAL_STROKE, FINAL_CLEARANCE)
  const finalCmp = await inkUnchanged(v20, final)
  if (finalCmp.inkChanged !== 0) throw new Error('final ring hit logo pixels')
  const out192Raw = await sharp(final).resize(192, 192).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const out192 = await sharp(out192Raw.data, {
    raw: { width: out192Raw.info.width, height: out192Raw.info.height, channels: 3 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const meta = await sharp(final).metadata()
  if (meta.channels !== 3) throw new Error(`v21 must stay opaque RGB, channels=${meta.channels} alpha=${meta.hasAlpha}`)

  for (const rel of TARGETS_512) writeFileSync(join(root, rel), final)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(final, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v21 any/maskable 512 mismatch')
  }

  console.log(
    JSON.stringify(
      {
        spec,
        ring: ringSpec(512),
        final: { stroke: FINAL_STROKE, clearance: FINAL_CLEARANCE, ...finalCmp },
        candidates: stats,
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
