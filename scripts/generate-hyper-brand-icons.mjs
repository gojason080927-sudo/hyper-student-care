/**
 * PWA icons from the ORIGINAL Hyper logo image — crop/resize only.
 * Does NOT redraw H / 하이퍼 / 영수입시전문 with fonts/SVG/Canvas shapes.
 *
 * - Strip outer white margin
 * - Fill remaining white/AA corner pixels with navy (full-bleed, no frame)
 * - Detect logo content bbox and zoom so H+하이퍼 read large on the home screen
 * - Uniform scale only (no logo re-layout / stretch)
 *
 * Run: node scripts/generate-hyper-brand-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
/** Same asset as KakaoTalk original brand cover */
const SOURCE = join(root, 'public', 'hyper-brand-cover-v1.png')
const NAVY = { r: 11, g: 31, b: 74, alpha: 255 }
const PREFIX = 'hyper-icon-v6'

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
  // Metallic silver / light glyph pixels (exclude textured navy bg)
  return luma(r, g, b) >= 100 && navyDist(r, g, b) > 40
}

/** Crop white plate; paint leftover white (rounded-corner outside) to navy. */
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

/**
 * Largest contiguous bright-row run = H + 하이퍼 + 영수입시전문.
 * Horizontal span merges syllable gaps up to 90px.
 */
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
    // Ignore sparse AA rim spikes (e.g. single bright edge column)
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

  // Minimal padding — keep soft shadow, avoid eating zoom budget
  const padX = Math.round((x1 - x0 + 1) * 0.012)
  const padY = Math.round((y1 - y0 + 1) * 0.02)
  const bx0 = Math.max(0, x0 - padX)
  const by0 = Math.max(0, y0 - padY)
  const bx1 = Math.min(width - 1, x1 + padX)
  const by1 = Math.min(height - 1, y1 + padY)

  const bounds = {
    x0: bx0,
    y0: by0,
    w: bx1 - bx0 + 1,
    h: by1 - by0 + 1,
    contentH: y1 - y0 + 1,
    contentW: x1 - x0 + 1,
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

/**
 * Center original logo pixels on full-bleed navy.
 * Scales by target glyph height fraction (H ≈ 55–60% of icon). Wide mark may
 * extend slightly past side edges; sharp composite clips symmetrically — only
 * a few px of outer shadow, not glyph cores, when targetHFrac≈0.56.
 * @param {number} size
 * @param {number} targetHFrac desired logo bbox height / icon size
 * @param {number} [maxWFrac=1] hard cap on drawn width / icon size (maskable safe zone)
 */
async function renderIcon(logoPng, size, targetHFrac, maxWFrac = 1) {
  const meta = await sharp(logoPng).metadata()
  const logoW = meta.width
  const logoH = meta.height
  // Prefer target height (H ≈ 55–60%). For maskable (maxWFrac<1), also respect safe width.
  let scale = (size * targetHFrac) / logoH
  const maxW = Math.round(size * Math.min(maxWFrac, 1))
  if (maxWFrac < 1 && logoW * scale > maxW) scale = maxW / logoW
  const drawW = Math.max(1, Math.round(logoW * scale))
  const drawH = Math.max(1, Math.round(logoH * scale))

  let layer = sharp(logoPng).resize(drawW, drawH, {
    fit: 'fill',
    kernel: 'lanczos3',
  })

  // If scaled mark is wider than the square, crop sides. Bias keep-left so H
  // serifs survive; extra trim comes from the right outer margin.
  const cropW = Math.min(drawW, size)
  const cropH = Math.min(drawH, size)
  if (cropW < drawW || cropH < drawH) {
    const overflowX = drawW - cropW
    const left = Math.max(0, Math.round(overflowX * 0.22))
    const top = Math.max(0, Math.round((drawH - cropH) / 2))
    layer = layer.extract({ left, top, width: cropW, height: cropH })
  }

  const resized = await layer.png().toBuffer()

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

  console.log('render', {
    size,
    targetHFrac,
    maxWFrac,
    drawW,
    drawH,
    placedW: cropW,
    placedH: cropH,
    hFrac: +(cropH / size).toFixed(3),
    wFrac: +(cropW / size).toFixed(3),
    clippedX: drawW > size,
  })
  return buf
}

async function write(dir, name, buf) {
  const out = join(dir, name)
  writeFileSync(out, buf)
  console.log('wrote', out.replace(root, '').replace(/\\/g, '/'))
}

async function writeBoth(name, buf) {
  await write(teacherDir, name, buf)
  await write(careDir, name, buf)
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

  // any: H ≈ 57% of icon height (original pixels). Slight right-biased side trim only.
  const any192 = await renderIcon(logoPng, 192, 0.57, 1)
  const any512 = await renderIcon(logoPng, 512, 0.57, 1)
  // maskable: width inside ~92% safe zone for round launchers (still ≫ old v5 maskable)
  const maskable = await renderIcon(logoPng, 512, 0.57, 0.92)
  const apple = await renderIcon(logoPng, 180, 0.57, 1)
  const splash = await renderIcon(logoPng, 512, 0.57, 1)
  const fav32 = await renderIcon(logoPng, 32, 0.57, 1)
  const fav16 = await renderIcon(logoPng, 16, 0.57, 1)

  await writeBoth(`${PREFIX}-192.png`, any192)
  await writeBoth(`${PREFIX}-512.png`, any512)
  await writeBoth(`${PREFIX}-maskable.png`, maskable)
  await writeBoth(`${PREFIX}-apple-touch.png`, apple)
  await writeBoth(`${PREFIX}-splash.png`, splash)
  await writeBoth(`${PREFIX}-favicon-32.png`, fav32)
  await writeBoth(`${PREFIX}-favicon-16.png`, fav16)

  // Legacy teacher install aliases used by older bookmarks
  await write(teacherDir, 'apple-touch-icon.png', apple)
  await write(teacherDir, 'pwa-192.png', any192)
  await write(teacherDir, 'pwa-512.png', any512)
  await write(teacherDir, 'maskable-512.png', maskable)

  console.log('done', PREFIX)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
