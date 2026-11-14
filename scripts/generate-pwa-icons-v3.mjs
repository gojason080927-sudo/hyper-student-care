/**
 * PWA icons v3 — crop the existing H from hyper-brand-cover-v1.png.
 * Does not redraw or restyle the H. Korean text is excluded.
 *
 * Run: node scripts/generate-pwa-icons-v3.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SOURCE = join(root, 'public', 'hyper-brand-cover-v1.png')
const teacherDir = join(root, 'public', 'teacher')
const careDir = join(root, 'public', 'care')
mkdirSync(teacherDir, { recursive: true })
mkdirSync(careDir, { recursive: true })

function isNearWhite(r, g, b) {
  return r > 230 && g > 230 && b > 230
}

const NAVY = { r: 11, g: 31, b: 74 }

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function navyDist(r, g, b) {
  const dr = r - NAVY.r
  const dg = g - NAVY.g
  const db = b - NAVY.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function isLogoPixel(r, g, b, a) {
  if (a < 20 || isNearWhite(r, g, b)) return false
  return luma(r, g, b) >= 100 && navyDist(r, g, b) > 40
}

async function loadPlate() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })
  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (!isNearWhite(data[i], data[i + 1], data[i + 2])) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const plate = Buffer.alloc(cropW * cropH * 4)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((minY + y) * width + (minX + x)) * channels
      const di = (y * cropW + x) * 4
      const r = data[si]
      const g = data[si + 1]
      const b = data[si + 2]
      const a = channels === 4 ? data[si + 3] : 255
      if (a < 20 || isNearWhite(r, g, b)) {
        plate[di] = NAVY.r
        plate[di + 1] = NAVY.g
        plate[di + 2] = NAVY.b
        plate[di + 3] = 255
      } else {
        plate[di] = r
        plate[di + 1] = g
        plate[di + 2] = b
        plate[di + 3] = 255
      }
    }
  }
  return {
    data: plate,
    width: cropW,
    height: cropH,
    sourceOffset: { minX, minY },
  }
}

function findHBounds(data, width, height) {
  const col = new Array(width).fill(0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) col[x]++
    }
  }

  const xs = []
  for (let x = 0; x < width; x++) {
    if (col[x] >= 20) xs.push(x)
  }
  if (xs.length === 0) throw new Error('No metallic columns found')

  const runs = []
  let rs = xs[0]
  let prev = xs[0]
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - prev > 18) {
      runs.push([rs, prev])
      rs = xs[i]
    }
    prev = xs[i]
  }
  runs.push([rs, prev])

  const substantial = runs
    .map(([a, b]) => {
      let peak = 0
      for (let x = a; x <= b; x++) peak = Math.max(peak, col[x])
      return { a, b, span: b - a + 1, peak }
    })
    .filter((r) => r.span >= 40 && r.peak >= 80)
    .sort((l, r) => l.a - r.a)

  if (substantial.length === 0) throw new Error('Could not isolate H column run')
  const hRun = substantial[0]
  const nextRun = substantial[1]
  const x0 = hRun.a
  const x1 = nextRun ? Math.min(hRun.b, nextRun.a - 8) : hRun.b

  const row = new Array(height).fill(0)
  for (let y = 0; y < height; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) row[y]++
    }
  }
  let best = { len: 0, start: 0, end: 0 }
  let runStart = null
  for (let y = 0; y <= height; y++) {
    const on = y < height && row[y] >= 18
    if (on && runStart === null) runStart = y
    if (!on && runStart !== null) {
      const len = y - runStart
      if (len > best.len) best = { len, start: runStart, end: y - 1 }
      runStart = null
    }
  }
  const y0 = best.start
  const y1 = best.end
  if (y1 < y0 || best.len < 40) throw new Error('Could not find H vertical span')

  const pad = Math.round(Math.max(x1 - x0 + 1, y1 - y0 + 1) * 0.06)
  const maxX = nextRun ? nextRun.a - 12 : width - 1
  const bounds = {
    x0: Math.max(0, x0 - pad),
    y0: Math.max(0, y0 - pad),
    x1: Math.min(maxX, x1 + pad),
    y1: Math.min(height - 1, y1 + pad),
  }
  bounds.w = bounds.x1 - bounds.x0 + 1
  bounds.h = bounds.y1 - bounds.y0 + 1
  return { bounds, hRun, nextRun, pad, sourceRuns: substantial }
}

function sampleNavy(data, width, height, bounds) {
  const points = [
    [bounds.x0, bounds.y0],
    [bounds.x1, bounds.y0],
    [bounds.x0, bounds.y1],
    [bounds.x1, bounds.y1],
  ]
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (const [x, y] of points) {
    const i = (y * width + x) * 4
    if (navyDist(data[i], data[i + 1], data[i + 2]) < 50) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n++
    }
  }
  if (n === 0) return { ...NAVY, alpha: 255 }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), alpha: 255 }
}

function extractSquare(data, width, height, bounds) {
  const side = Math.max(bounds.w, bounds.h)
  const navy = sampleNavy(data, width, height, bounds)
  const ox = Math.floor((side - bounds.w) / 2)
  const oy = Math.floor((side - bounds.h) / 2)
  const out = Buffer.alloc(side * side * 4)
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const di = (y * side + x) * 4
      const px = bounds.x0 + (x - ox)
      const py = bounds.y0 + (y - oy)
      const inside =
        px >= bounds.x0 && px <= bounds.x1 && py >= bounds.y0 && py <= bounds.y1
      if (!inside || px < 0 || py < 0 || px >= width || py >= height) {
        out[di] = navy.r
        out[di + 1] = navy.g
        out[di + 2] = navy.b
        out[di + 3] = 255
        continue
      }
      const si = (py * width + px) * 4
      out[di] = data[si]
      out[di + 1] = data[si + 1]
      out[di + 2] = data[si + 2]
      out[di + 3] = 255
    }
  }
  return { data: out, side, sx: bounds.x0, sy: bounds.y0, navy }
}

async function toPng(raw, w, h) {
  return sharp(raw, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function renderAny(squarePng, size) {
  return sharp(squarePng)
    .resize(size, size, { kernel: 'lanczos3', fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function renderMaskable(hPng, size, navy) {
  const meta = await sharp(hPng).metadata()
  const maxDiag = size * 0.8
  const scale = maxDiag / Math.hypot(meta.width, meta.height)
  const placedW = Math.max(1, Math.round(meta.width * scale))
  const placedH = Math.max(1, Math.round(meta.height * scale))
  const resized = await sharp(hPng)
    .resize(placedW, placedH, { kernel: 'lanczos3', fit: 'fill' })
    .png()
    .toBuffer()

  const bg = { r: navy.r, g: navy.g, b: navy.b, alpha: 1 }
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function occupancy(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })
  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const inset = Math.round(width * 0.1)
  const radius = width * 0.4
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const corners = [
    [minX, minY],
    [maxX, minY],
    [minX, maxY],
    [maxX, maxY],
  ]
  const maxCornerDist = Math.max(
    ...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)),
  )
  return {
    box: `${bw}x${bh}`,
    pct: { w: +(100 * bw / width).toFixed(1), h: +(100 * bh / height).toFixed(1) },
    inset: {
      left: +(100 * minX / width).toFixed(1),
      top: +(100 * minY / height).toFixed(1),
      right: +(100 * (width - 1 - maxX) / width).toFixed(1),
      bottom: +(100 * (height - 1 - maxY) / height).toFixed(1),
    },
    inside80Circle: maxCornerDist <= radius + 0.5,
    inside80Square:
      minX >= inset && minY >= inset && maxX < width - inset && maxY < height - inset,
    maxCornerDist: +maxCornerDist.toFixed(1),
    circleRadius: +radius.toFixed(1),
  }
}

async function write(dir, name, buf) {
  const out = join(dir, name)
  writeFileSync(out, buf)
  console.log('wrote', out.replace(root, '').replaceAll('\\', '/'), buf.length)
}

async function main() {
  const plate = await loadPlate()
  const found = findHBounds(plate.data, plate.width, plate.height)
  console.log('plate', {
    width: plate.width,
    height: plate.height,
    sourceOffset: plate.sourceOffset,
  })
  console.log('H tight+pad bounds on plate', found.bounds)
  console.log('H column run', found.hRun)
  console.log('next glyph run (excluded)', found.nextRun)

  const square = extractSquare(plate.data, plate.width, plate.height, found.bounds)
  console.log('square extract', { side: square.side, sx: square.sx, sy: square.sy })

  const abs = {
    x0: plate.sourceOffset.minX + square.sx,
    y0: plate.sourceOffset.minY + square.sy,
    side: square.side,
  }
  console.log('crop on original hyper-brand-cover-v1.png', {
    left: abs.x0,
    top: abs.y0,
    width: abs.side,
    height: abs.side,
    right: abs.x0 + abs.side,
    bottom: abs.y0 + abs.side,
  })

  const squarePng = await toPng(square.data, square.side, square.side)
  const hOnly = await sharp(squarePng)
    .trim({ background: { r: 11, g: 31, b: 74, alpha: 1 }, threshold: 18 })
    .png()
    .toBuffer()
  const hMeta = await sharp(hOnly).metadata()
  console.log('trimmed H png', { width: hMeta.width, height: hMeta.height })

  const any192 = await renderAny(squarePng, 192)
  const any512 = await renderAny(squarePng, 512)
  const mask192 = await renderMaskable(hOnly, 192, square.navy)
  const mask512 = await renderMaskable(hOnly, 512, square.navy)

  console.log('any 192 occupancy', await occupancy(any192))
  console.log('any 512 occupancy', await occupancy(any512))
  console.log('maskable 192 occupancy', await occupancy(mask192))
  console.log('maskable 512 occupancy', await occupancy(mask512))

  const teacher = {
    'hyper-teacher-icon-192-v3.png': any192,
    'hyper-teacher-icon-512-v3.png': any512,
    'hyper-teacher-maskable-192-v3.png': mask192,
    'hyper-teacher-maskable-512-v3.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-192-v3.png': any192,
    'hyper-parent-icon-512-v3.png': any512,
    'hyper-parent-maskable-192-v3.png': mask192,
    'hyper-parent-maskable-512-v3.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await write(teacherDir, name, buf)
  for (const [name, buf] of Object.entries(parent)) await write(careDir, name, buf)
  console.log('done v3')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
