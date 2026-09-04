/**
 * PWA icons from the official Hyper brand cover — crop/resize only.
 * Does not redraw H / 하이퍼 / 영수입시전문.
 *
 * - Strip outer white margin
 * - Paint leftover white/AA corner pixels with navy (full-bleed)
 * - Tight-crop to H + 하이퍼 + 영수입시전문
 * - any: fill ~98% of the square without clipping glyphs
 * - maskable: keep the full mark inside ~84% (H + 하이퍼 stay inside typical Android masks)
 *
 * Run: node scripts/generate-pwa-icons-v2.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SOURCE = join(root, 'public', 'hyper-brand-cover-v1.png')
const NAVY = { r: 11, g: 31, b: 74, alpha: 255 }

const teacherDir = join(root, 'public', 'teacher')
const careDir = join(root, 'public', 'care')
mkdirSync(teacherDir, { recursive: true })
mkdirSync(careDir, { recursive: true })

function isNearWhite(r, g, b) {
  return r > 230 && g > 230 && b > 230
}

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

async function prepareOriginalPlate() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

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

  if (maxX <= minX || maxY <= minY) {
    throw new Error('Could not find logo plate in source image')
  }

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  console.log('plate crop', { minX, minY, cropW, cropH })

  const cropped = Buffer.alloc(cropW * cropH * 4)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((minY + y) * width + (minX + x)) * channels
      const di = (y * cropW + x) * 4
      const r = data[si]
      const g = data[si + 1]
      const b = data[si + 2]
      const a = channels === 4 ? data[si + 3] : 255
      if (a < 20 || isNearWhite(r, g, b)) {
        cropped[di] = NAVY.r
        cropped[di + 1] = NAVY.g
        cropped[di + 2] = NAVY.b
        cropped[di + 3] = 255
      } else {
        cropped[di] = r
        cropped[di + 1] = g
        cropped[di + 2] = b
        cropped[di + 3] = 255
      }
    }
  }

  return { data: cropped, width: cropW, height: cropH }
}

function findLogoBounds(data, width, height) {
  const row = new Array(height).fill(0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) row[y]++
    }
  }

  let best = { len: 0, start: 0, end: 0 }
  let runStart = null
  for (let y = 0; y <= height; y++) {
    const on = y < height && row[y] >= 40
    if (on && runStart === null) runStart = y
    if (!on && runStart !== null) {
      const len = y - runStart
      if (len > best.len) best = { len, start: runStart, end: y - 1 }
      runStart = null
    }
  }

  const y0 = best.start
  const y1 = best.end
  const col = new Array(width).fill(0)
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) col[x]++
    }
  }

  const xs = []
  for (let x = 0; x < width; x++) {
    if (col[x] >= 12) xs.push(x)
  }
  if (xs.length === 0) throw new Error('Could not find logo pixels')

  const runs = []
  let rs = xs[0]
  let prev = xs[0]
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - prev > 90) {
      runs.push([rs, prev])
      rs = xs[i]
    }
    prev = xs[i]
  }
  runs.push([rs, prev])

  const substantial = runs.filter(([a, b]) => {
    const span = b - a + 1
    if (span < 30) return false
    for (let x = a; x <= b; x++) if (col[x] >= 40) return true
    return false
  })
  if (substantial.length === 0) throw new Error('Could not find logo horizontal span')

  const x0 = Math.min(...substantial.map((r) => r[0]))
  const x1 = Math.max(...substantial.map((r) => r[1]))
  const padX = Math.round((x1 - x0 + 1) * 0.012)
  const padY = Math.round((y1 - y0 + 1) * 0.02)
  const bounds = {
    x0: Math.max(0, x0 - padX),
    y0: Math.max(0, y0 - padY),
    w: Math.min(width - 1, x1 + padX) - Math.max(0, x0 - padX) + 1,
    h: Math.min(height - 1, y1 + padY) - Math.max(0, y0 - padY) + 1,
  }
  console.log('logo bounds', bounds)
  return bounds
}

function extractRegion(data, width, bounds) {
  const out = Buffer.alloc(bounds.w * bounds.h * 4)
  for (let y = 0; y < bounds.h; y++) {
    for (let x = 0; x < bounds.w; x++) {
      const si = ((bounds.y0 + y) * width + (bounds.x0 + x)) * 4
      const di = (y * bounds.w + x) * 4
      out[di] = data[si]
      out[di + 1] = data[si + 1]
      out[di + 2] = data[si + 2]
      out[di + 3] = 255
    }
  }
  return out
}

/** Uniform scale, no stretch. Logo is fully visible inside boxFrac of the icon. */
async function renderIcon(logoPng, size, boxFrac) {
  const box = Math.max(1, Math.round(size * boxFrac))
  const resized = await sharp(logoPng)
    .resize(box, box, {
      fit: 'contain',
      background: NAVY,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()

  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: NAVY,
    },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer()

  const meta = await sharp(logoPng).metadata()
  const scale = Math.min(box / meta.width, box / meta.height)
  console.log('render', {
    size,
    boxFrac,
    placedW: Math.round(meta.width * scale),
    placedH: Math.round(meta.height * scale),
  })
  return buf
}

async function write(dir, name, buf) {
  const out = join(dir, name)
  writeFileSync(out, buf)
  console.log('wrote', out.replace(root, '').replace(/\\/g, '/'))
}

async function main() {
  const plate = await prepareOriginalPlate()
  const bounds = findLogoBounds(plate.data, plate.width, plate.height)
  const region = extractRegion(plate.data, plate.width, bounds)
  const logoPng = await sharp(region, {
    raw: { width: bounds.w, height: bounds.h, channels: 4 },
  })
    .png()
    .toBuffer()

  const any192 = await renderIcon(logoPng, 192, 0.98)
  const any512 = await renderIcon(logoPng, 512, 0.98)
  const mask192 = await renderIcon(logoPng, 192, 0.84)
  const mask512 = await renderIcon(logoPng, 512, 0.84)
  const apple = await renderIcon(logoPng, 180, 0.98)
  const fav32 = await renderIcon(logoPng, 32, 0.98)
  const fav16 = await renderIcon(logoPng, 16, 0.98)

  const teacher = {
    'hyper-teacher-icon-192-v2.png': any192,
    'hyper-teacher-icon-512-v2.png': any512,
    'hyper-teacher-maskable-192-v2.png': mask192,
    'hyper-teacher-maskable-512-v2.png': mask512,
    'hyper-teacher-apple-touch-v2.png': apple,
    'hyper-teacher-favicon-32-v2.png': fav32,
    'hyper-teacher-favicon-16-v2.png': fav16,
  }
  const parent = {
    'hyper-parent-icon-192-v2.png': any192,
    'hyper-parent-icon-512-v2.png': any512,
    'hyper-parent-maskable-192-v2.png': mask192,
    'hyper-parent-maskable-512-v2.png': mask512,
    'hyper-parent-apple-touch-v2.png': apple,
    'hyper-parent-favicon-32-v2.png': fav32,
    'hyper-parent-favicon-16-v2.png': fav16,
  }

  for (const [name, buf] of Object.entries(teacher)) {
    await write(teacherDir, name, buf)
  }
  for (const [name, buf] of Object.entries(parent)) {
    await write(careDir, name, buf)
  }
  console.log('done v2')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
