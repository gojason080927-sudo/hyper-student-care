/**
 * HYPER PWA Android icons v20 — same attached v18 mark, smaller than v19.
 *
 * The attached Galaxy home photo of HYPERTEACHER shows v18's Korean band
 * sitting on the One UI mask edge. Mapping that photo onto Chrome's 446
 * viewport + measured n=2.6 superellipse:
 *   v18 376×408 @ (68,52) — Korean bottom-left is 16px OUTSIDE n=2.6
 *   v19 315×342 @ (99,85) — Korean gap 23px (still tight at 하 / 원)
 *
 * v20 keeps the 512 #FEFEFE canvas and the unmodified v18 source pixels.
 * The ink box is scaled uniformly and centered so the Korean band
 * `하이퍼 영수 입시학원` has ≥36px gap to n=2.6 (and ≥12px to n=2.4),
 * which is ~12px gutter on a real ~144px Galaxy tile. Book tops keep
 * ≥16px on n=2.6. Largest such size — no extra shrink.
 *
 * Does not overwrite v12–v19 or iOS apple-touch.
 * Run: node scripts/generate-pwa-icons-v20.mjs
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
export const KOREAN_MIN_GAP_N26 = 36
export const KOREAN_MIN_GAP_N24 = 12
export const BOOK_MIN_GAP_N26 = 16

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v20-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v20-512.png',
  'public/care/hyper-parent-icon-v20-512.png',
  'public/care/hyper-parent-icon-maskable-v20-512.png',
  'public/hub/hyper-hub-icon-v20-512.png',
  'public/hub/hyper-hub-icon-maskable-v20-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v20-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v20-192.png',
  'public/care/hyper-parent-icon-v20-192.png',
  'public/care/hyper-parent-icon-maskable-v20-192.png',
  'public/hub/hyper-hub-icon-v20-192.png',
  'public/hub/hyper-hub-icon-maskable-v20-192.png',
]

function isBackground(r, g, b, a) {
  return a < 16 || (r >= 248 && g >= 248 && b >= 248)
}

function superGap(x, y, spec, n) {
  const cx = spec.origin + (spec.viewport - 1) / 2
  const cy = spec.origin + (spec.viewport - 1) / 2
  const radius = spec.viewport / 2
  const u = (x - cx) / radius
  const v = (y - cy) / radius
  const p = Math.abs(u) ** n + Math.abs(v) ** n
  if (p === 0) return radius
  return radius * (1 - p ** (1 / n))
}

export function fitAtHeight(inkW, inkH, spec, height) {
  const aspect = inkW / inkH
  const width = Math.round(aspect * height)
  const left = spec.origin + Math.round((spec.viewport - width) / 2)
  const top = spec.origin + Math.round((spec.viewport - height) / 2)
  return { width, height, left, top, scale: height / inkH }
}

export function mapBox(rel, fit) {
  return {
    minX: fit.left + rel.minX * fit.scale,
    minY: fit.top + rel.minY * fit.scale,
    maxX: fit.left + rel.maxX * fit.scale,
    maxY: fit.top + rel.maxY * fit.scale,
  }
}

export function minBandGap(box, spec, n) {
  const pts = [
    [box.minX, box.minY],
    [box.maxX, box.minY],
    [box.minX, box.maxY],
    [box.maxX, box.maxY],
    [(box.minX + box.maxX) / 2, box.maxY],
  ]
  return Math.min(...pts.map(([x, y]) => superGap(x, y, spec, n)))
}

export async function measureBands(srcBuf, ink) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const koreanTop = ink.minY + Math.round(ink.h * 0.92)
  const booksBot = ink.minY + Math.round(ink.h * 0.12)

  const scan = (y0, y1, darkOnly) => {
    let minX = w
    let minY = info.height
    let maxX = -1
    let maxY = -1
    for (let y = y0; y <= y1; y++) {
      for (let x = ink.minX; x <= ink.maxX; x++) {
        const i = (y * w + x) * ch
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        if (isBackground(r, g, b, a)) continue
        if (darkOnly && (r > 80 || g > 80 || b > 80)) continue
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      w: maxX - minX + 1,
      h: maxY - minY + 1,
      rel: {
        minX: minX - ink.minX,
        minY: minY - ink.minY,
        maxX: maxX - ink.minX,
        maxY: maxY - ink.minY,
      },
    }
  }

  return {
    korean: scan(koreanTop, ink.maxY, true),
    books: scan(ink.minY, booksBot, false),
  }
}

export function maxFitKoreanFirst(inkW, inkH, koreanRel, booksRel, spec) {
  for (let height = 408; height >= 200; height--) {
    const fit = fitAtHeight(inkW, inkH, spec, height)
    const korean = mapBox(koreanRel, fit)
    const books = mapBox(booksRel, fit)
    if (
      minBandGap(korean, spec, 2.6) >= KOREAN_MIN_GAP_N26 &&
      minBandGap(korean, spec, 2.4) >= KOREAN_MIN_GAP_N24 &&
      minBandGap(books, spec, 2.6) >= BOOK_MIN_GAP_N26
    ) {
      return {
        ...fit,
        inset: Math.round((spec.viewport - height) / 2),
        koreanGapN26: +minBandGap(korean, spec, 2.6).toFixed(2),
        koreanGapN24: +minBandGap(korean, spec, 2.4).toFixed(2),
        booksGapN26: +minBandGap(books, spec, 2.6).toFixed(2),
      }
    }
  }
  throw new Error('no Korean-safe One UI fit')
}

async function compose(srcBuf, size) {
  const spec = chromeAdaptiveViewport(size)
  const measured = await measureSource(srcBuf)
  if (measured.bg.r !== FILL.r || measured.bg.g !== FILL.g || measured.bg.b !== FILL.b) {
    throw new Error(`source background drifted: ${JSON.stringify(measured.bg)}`)
  }
  const bands = await measureBands(srcBuf, measured.ink)
  const fit = maxFitKoreanFirst(measured.ink.w, measured.ink.h, bands.korean.rel, bands.books.rel, spec)
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
  const bands = await measureBands(src, measured.ink)
  const fit = maxFitKoreanFirst(measured.ink.w, measured.ink.h, bands.korean.rel, bands.books.rel, spec)
  const out512 = await compose(src, 512)
  const out192 = await sharp(out512).resize(192, 192).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) throw new Error('v20 must stay opaque RGB')
  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(out512, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v20 any/maskable 512 mismatch')
  }
  console.log(
    JSON.stringify(
      {
        bg: measured.bg,
        ink: measured.ink,
        korean: bands.korean,
        books: bands.books,
        spec,
        fit,
        vsV18: { width: 376, height: 408, left: 68, top: 52, scale: +(fit.height / 408).toFixed(4) },
        vsV19: { width: 315, height: 342, left: 99, top: 85, scale: +(fit.height / 342).toFixed(4) },
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
