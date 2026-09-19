/**
 * HYPER PWA Android icons v16 — compose to Chrome WebAPK adaptive viewport.
 *
 * Do not scale the finished badge. Place each design element on the
 * canvas Chrome actually shows after WebAPK adaptive conversion.
 *
 * Locked geometry: scripts/chrome-webapk-icon-spec.mjs
 * 512 source → pad 79 → layer 670 → viewport 446 @ origin 33.
 *
 * Elements (re-placed, not uniformly scaled):
 *   black field, books H, HYPER, purple underline, gold frame,
 *   하이퍼 영수 입시학원
 *
 * Does not overwrite v12–v15 or iOS apple-touch.
 * Run: node scripts/generate-pwa-icons-v16.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromeAdaptiveViewport } from './chrome-webapk-icon-spec.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASTER = join(root, 'public', 'teacher', 'hyper-teacher-icon-v12-512.png')
const FILL = { r: 0, g: 0, b: 0 }
const GOLD = { r: 221, g: 174, b: 74 }
const PURPLE = { r: 123, g: 12, b: 251 }

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

function isGold(r, g, b) {
  return r > 150 && g > 90 && b < 160 && r > b + 40 && r >= g - 10
}

function floodClearEdgeWhite(data, width, height, channels, threshold = 230) {
  const seen = new Uint8Array(width * height)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (seen[idx]) return
    const i = idx * channels
    const a = data[i + 3]
    const L = luma(data[i], data[i + 1], data[i + 2])
    if (a >= 16 && L <= threshold) return
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
    const i = idx * channels
    data[i + 3] = 0
    const x = idx % width
    const y = (idx / width) | 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
}

function liftDarkToLight(data, channels) {
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 16) continue
    if (isGold(r, g, b)) continue
    const L = luma(r, g, b)
    if (L > 232) {
      data[i + 3] = 0
      continue
    }
    data[i] = 255 - r
    data[i + 1] = 255 - g
    data[i + 2] = 255 - b
  }
}

async function rawPng(data, width, height, channels) {
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer()
}

async function extractSlice(srcBuf, left, top, width, height, mode) {
  const slice = await sharp(srcBuf)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { data, info } = slice
  if (mode === 'books') {
    floodClearEdgeWhite(data, info.width, info.height, info.channels)
  } else if (mode === 'word') {
    floodClearEdgeWhite(data, info.width, info.height, info.channels)
    liftDarkToLight(data, info.channels)
  }
  const tight = tightCrop(data, info.width, info.height, info.channels)
  return rawPng(tight.data, tight.width, tight.height, info.channels)
}

function tightCrop(data, width, height, channels) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < 16) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new Error('empty layer after extract')
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const out = Buffer.alloc(w * h * channels)
  for (let y = 0; y < h; y++) {
    const src = ((minY + y) * width + minX) * channels
    data.copy(out, y * w * channels, src, src + w * channels)
  }
  return { data: out, width: w, height: h, minX, minY }
}

async function extractLayers(srcBuf) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const ch = info.channels
  const at = (x, y) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }

  let ominX = w
  let ominY = w
  let omaxX = -1
  let omaxY = -1
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y)[3] < 16) continue
      if (x < ominX) ominX = x
      if (y < ominY) ominY = y
      if (x > omaxX) omaxX = x
      if (y > omaxY) omaxY = y
    }
  }

  const framePad = 18
  const x0 = ominX + framePad
  const x1 = omaxX - framePad
  const rowInk = []
  for (let y = ominY + framePad; y <= omaxY - framePad; y++) {
    let ink = 0
    for (let x = x0; x <= x1; x++) {
      const [r, g, b, a] = at(x, y)
      if (a < 16 || luma(r, g, b) > 240) continue
      ink++
    }
    rowInk.push({ y, ink })
  }
  const active = rowInk.filter((row) => row.ink > 20)
  const bands = []
  let start = active[0].y
  for (let i = 1; i < active.length; i++) {
    if (active[i].y > active[i - 1].y + 3) {
      bands.push([start, active[i - 1].y])
      start = active[i].y
    }
  }
  bands.push([start, active[active.length - 1].y])
  if (bands.length < 3) {
    throw new Error(`expected books/HYPER, underline, korean bands, got ${JSON.stringify(bands)}`)
  }

  const mark = bands[0]
  const underline = bands[1]
  const korean = bands[2]
  const gapRows = rowInk.filter((row) => row.y >= mark[0] && row.y <= mark[1] && row.ink < 80)
  let hyperY = mark[1]
  if (gapRows.length) {
    const gap = gapRows.reduce((best, row) => (row.ink < best.ink ? row : best), gapRows[0])
    hyperY = gap.y
  }

  const cutW = x1 - x0 + 1
  const booksTop = mark[0]
  const booksBot = Math.max(mark[0] + 8, hyperY - 2)
  const hyperTop = Math.min(hyperY + 2, mark[1] - 8)
  return {
    books: await extractSlice(srcBuf, x0, booksTop, cutW, booksBot - booksTop + 1, 'books'),
    hyper: await extractSlice(srcBuf, x0, hyperTop, cutW, mark[1] - hyperTop + 1, 'word'),
    underline: await extractSlice(srcBuf, x0, underline[0], cutW, underline[1] - underline[0] + 1, 'word'),
    korean: await extractSlice(srcBuf, x0, korean[0], cutW, korean[1] - korean[0] + 1, 'word'),
    bands: { books: [booksTop, booksBot], hyper: [hyperTop, mark[1]], underline, korean },
  }
}

function goldFrameSvg(size, inset, stroke, radius) {
  const x = inset + stroke / 2
  const inner = size - inset * 2 - stroke
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect x="${x}" y="${x}" width="${inner}" height="${inner}" rx="${radius}" ry="${radius}"
    fill="none" stroke="rgb(${GOLD.r},${GOLD.g},${GOLD.b})" stroke-width="${stroke}"/>
</svg>`)
}

function purpleLineSvg(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${height}" rx="${Math.max(1, height / 2)}"
    fill="rgb(${PURPLE.r},${PURPLE.g},${PURPLE.b})"/>
</svg>`)
}

export async function composeSpec(srcBuf, size) {
  const spec = chromeAdaptiveViewport(size)
  const layers = await extractLayers(srcBuf)
  const booksMeta = await sharp(layers.books).metadata()
  const hyperMeta = await sharp(layers.hyper).metadata()
  const koreanMeta = await sharp(layers.korean).metadata()

  const stroke = Math.max(5, Math.round(spec.viewport * (11 / 446)))
  const frameInset = Math.max(6, Math.round(spec.viewport * (8 / 446)))
  const innerPad = Math.max(8, Math.round(spec.viewport * (10 / 446)))
  const contentSide = spec.viewport - (frameInset + stroke + innerPad) * 2
  const contentOrigin = spec.origin + frameInset + stroke + innerPad

  const lineH = Math.max(4, Math.round(contentSide * 0.016))
  const gapBooks = Math.max(6, Math.round(contentSide * 0.028))
  const gapLine = Math.max(4, Math.round(contentSide * 0.018))
  const gapKorean = Math.max(6, Math.round(contentSide * 0.022))
  const stack0 = booksMeta.height + hyperMeta.height + koreanMeta.height + lineH + gapBooks + gapLine + gapKorean
  const width0 = Math.max(booksMeta.width, hyperMeta.width, koreanMeta.width)
  const scale = Math.min(contentSide / width0, contentSide / stack0)

  const bw = Math.round(booksMeta.width * scale)
  const bh = Math.round(booksMeta.height * scale)
  const hw = Math.round(hyperMeta.width * scale)
  const hh = Math.round(hyperMeta.height * scale)
  const kw = Math.round(koreanMeta.width * scale)
  const kh = Math.round(koreanMeta.height * scale)
  const lw = Math.round(Math.min(contentSide * 0.78, hw * 0.94))
  const stack = bh + hh + kh + lineH + gapBooks + gapLine + gapKorean
  let y = contentOrigin + Math.round((contentSide - stack) / 2)

  const booksR = await sharp(layers.books).resize(bw, bh, { fit: 'fill' }).png().toBuffer()
  const hyperR = await sharp(layers.hyper).resize(hw, hh, { fit: 'fill' }).png().toBuffer()
  const koreanR = await sharp(layers.korean).resize(kw, kh, { fit: 'fill' }).png().toBuffer()
  const lineR = await sharp(purpleLineSvg(lw, lineH)).png().toBuffer()
  const frameR = await sharp(
    goldFrameSvg(size, spec.origin + frameInset, stroke, Math.round(spec.viewport * 0.2)),
  )
    .png()
    .toBuffer()

  const composites = [
    { input: booksR, left: contentOrigin + Math.round((contentSide - bw) / 2), top: y },
  ]
  y += bh + gapBooks
  composites.push({ input: hyperR, left: contentOrigin + Math.round((contentSide - hw) / 2), top: y })
  y += hh + gapLine
  composites.push({ input: lineR, left: contentOrigin + Math.round((contentSide - lw) / 2), top: y })
  y += lineH + gapKorean
  composites.push({ input: koreanR, left: contentOrigin + Math.round((contentSide - kw) / 2), top: y })
  composites.push({ input: frameR, left: 0, top: 0 })

  return sharp({
    create: { width: size, height: size, channels: 3, background: FILL },
  })
    .composite(composites)
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  const src = readFileSync(MASTER)
  const meta = await sharp(src).metadata()
  if (meta.format !== 'png' || meta.width !== 512) {
    throw new Error(`unexpected master ${meta.format} ${meta.width}`)
  }
  const spec = chromeAdaptiveViewport(512)
  if (spec.padding !== 79 || spec.padded !== 670 || spec.viewport !== 446 || spec.origin !== 33) {
    throw new Error(`Chrome 512 integer path drifted: ${JSON.stringify(spec)}`)
  }
  const out512 = await composeSpec(src, 512)
  const out192 = await sharp(out512).resize(192, 192).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  const outMeta = await sharp(out512).metadata()
  if (outMeta.hasAlpha || outMeta.channels !== 3) throw new Error('v16 must stay opaque RGB')
  for (const rel of TARGETS_512) writeFileSync(join(root, rel), out512)
  for (const rel of TARGETS_192) writeFileSync(join(root, rel), out192)
  if (Buffer.compare(out512, readFileSync(join(root, TARGETS_512[1]))) !== 0) {
    throw new Error('v16 any/maskable 512 mismatch')
  }
  console.log(
    `wrote v16 any===maskable viewport=${spec.viewport} origin=${spec.origin} pad=${spec.padding} padded=${spec.padded}`,
  )
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
