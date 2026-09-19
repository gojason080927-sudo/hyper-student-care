/**
 * HYPER ACADEMY PWA icon v11
 *
 * Uses the approved source JPEG only. Allowed operations: crop, rounded-rect
 * alpha mask, resize, canvas/safe-zone padding, PNG/WebP encode.
 * Does not redesign, recolor, or invent artwork.
 * Does not overwrite v10 / hub v1 icon files.
 *
 * Run: node scripts/generate-pwa-icons-v11.mjs
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const ATTACHED_SOURCE =
  '/home/ubuntu/.cursor/projects/workspace/assets/5bb2bfb5-e04e-42de-a677-1f207d47fded.jpg'
const REPO_SOURCE = join(root, 'public', 'hyper-academy-logo-source-v11.jpg')
const PREVIEW_DIR = '/tmp/hyper-logo-v11-preview'

const DARK = 40
const EXTERIOR = 150
const FRAME_PAD = 6
const MASKABLE_FIT = 0.64

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function bboxOf(data, width, height, channels, pred) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (!pred(data[i], data[i + 1], data[i + 2], data[i + 3] ?? 255)) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new Error('no matching pixels for bbox')
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

function firstMatchX(data, width, channels, y, x0, x1, step, pred) {
  for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) {
    const i = (y * width + x) * channels
    if (pred(data[i], data[i + 1], data[i + 2], data[i + 3] ?? 255)) return x
  }
  return null
}

function firstMatchY(data, width, channels, x, y0, y1, step, pred) {
  for (let y = y0; step > 0 ? y <= y1 : y >= y1; y += step) {
    const i = (y * width + x) * channels
    if (pred(data[i], data[i + 1], data[i + 2], data[i + 3] ?? 255)) return y
  }
  return null
}

function detectRadii(data, width, height, channels, box) {
  const dark = (r, g, b) => luma(r, g, b) <= DARK
  const top = firstMatchX(data, width, channels, box.minY, box.minX, box.maxX, 1, dark)
  const bottom = firstMatchX(data, width, channels, box.maxY, box.minX, box.maxX, 1, dark)
  const left = firstMatchY(data, width, channels, box.minX, box.minY, box.maxY, 1, dark)
  const right = firstMatchY(data, width, channels, box.maxX, box.minY, box.maxY, 1, dark)
  if (top == null || bottom == null || left == null || right == null) {
    throw new Error('could not detect rounded-square radius from source')
  }
  const radii = [
    top - box.minX,
    box.maxX - (firstMatchX(data, width, channels, box.minY, box.maxX, box.minX, -1, dark) ?? box.maxX),
    bottom - box.minX,
    box.maxX - (firstMatchX(data, width, channels, box.maxY, box.maxX, box.minX, -1, dark) ?? box.maxX),
    left - box.minY,
    box.maxY - (firstMatchY(data, width, channels, box.minX, box.maxY, box.minY, -1, dark) ?? box.maxY),
    right - box.minY,
    box.maxY - (firstMatchY(data, width, channels, box.maxX, box.maxY, box.minY, -1, dark) ?? box.maxY),
  ]
  const radius = Math.round(radii.reduce((a, b) => a + b, 0) / radii.length)
  return { radius, radii }
}

function floodClearExterior(data, width, height, channels) {
  const seen = new Uint8Array(width * height)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (seen[idx]) return
    const i = idx * channels
    if (luma(data[i], data[i + 1], data[i + 2]) < EXTERIOR) return
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
    const y = (idx - x) / width
    const i = idx * channels
    data[i] = 0
    data[i + 1] = 0
    data[i + 2] = 0
    data[i + 3] = 0
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }
}

function roundedRectSvg(size, radius) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  )
}

function circleSvg(size) {
  const mid = size / 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${mid}" cy="${mid}" r="${mid}" fill="#fff"/></svg>`,
  )
}

async function applyRoundedMask(png, size, radius) {
  const mask = await sharp(roundedRectSvg(size, radius)).png().toBuffer()
  return sharp(png).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function writePng(path, buf) {
  writeFileSync(path, buf)
  const meta = await sharp(buf).metadata()
  console.log(
    'wrote',
    path.replace(root, '').replaceAll('\\', '/'),
    `${meta.width}x${meta.height}`,
    'alpha=' + Boolean(meta.hasAlpha),
    buf.length,
  )
}

function assertSquare(meta, path) {
  if (meta.width !== meta.height) {
    throw new Error(`${path} is not square: ${meta.width}x${meta.height}`)
  }
}

async function main() {
  mkdirSync(join(root, 'public'), { recursive: true })
  mkdirSync(join(root, 'public', 'teacher'), { recursive: true })
  mkdirSync(join(root, 'public', 'care'), { recursive: true })
  mkdirSync(join(root, 'public', 'hub'), { recursive: true })
  mkdirSync(PREVIEW_DIR, { recursive: true })

  copyFileSync(ATTACHED_SOURCE, REPO_SOURCE)
  console.log('copied approved source → public/hyper-academy-logo-source-v11.jpg')

  const sourceMeta = await sharp(REPO_SOURCE).metadata()
  if (sourceMeta.format !== 'jpeg' || sourceMeta.width !== 1536 || sourceMeta.height !== 1536) {
    throw new Error(
      `unexpected source: format=${sourceMeta.format} ${sourceMeta.width}x${sourceMeta.height}`,
    )
  }

  const { data, info } = await sharp(REPO_SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const frame = bboxOf(
    data,
    info.width,
    info.height,
    info.channels,
    (r, g, b, a) => a > 8 && luma(r, g, b) <= DARK,
  )
  const { radius, radii } = detectRadii(data, info.width, info.height, info.channels, frame)
  const padded = {
    minX: Math.max(0, frame.minX - FRAME_PAD),
    minY: Math.max(0, frame.minY - FRAME_PAD),
    maxX: Math.min(info.width - 1, frame.maxX + FRAME_PAD),
    maxY: Math.min(info.height - 1, frame.maxY + FRAME_PAD),
  }
  padded.w = padded.maxX - padded.minX + 1
  padded.h = padded.maxY - padded.minY + 1
  const side = Math.max(padded.w, padded.h)
  const extraX = side - padded.w
  const extraY = side - padded.h
  const extract = {
    left: Math.max(0, padded.minX - Math.floor(extraX / 2)),
    top: Math.max(0, padded.minY - Math.floor(extraY / 2)),
    width: side,
    height: side,
  }
  if (extract.left + extract.width > info.width) extract.left = info.width - extract.width
  if (extract.top + extract.height > info.height) extract.top = info.height - extract.height

  console.log(
    JSON.stringify(
      {
        source: { format: sourceMeta.format, width: sourceMeta.width, height: sourceMeta.height },
        frame,
        radii,
        radius,
        radiusPct: +((100 * radius) / side).toFixed(2),
        extract,
      },
      null,
      2,
    ),
  )

  if (radius < side * 0.12 || radius > side * 0.36) {
    throw new Error(`detected radius ${radius} looks unlike a rounded-square for ${side}px crop`)
  }

  const cropped = await sharp(REPO_SOURCE).extract(extract).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  floodClearExterior(cropped.data, cropped.info.width, cropped.info.height, cropped.info.channels)
  const anyMaster = await sharp(Buffer.from(cropped.data), {
    raw: {
      width: cropped.info.width,
      height: cropped.info.height,
      channels: cropped.info.channels,
    },
  })
    .png()
    .toBuffer()

  const any512 = await sharp(anyMaster)
    .resize(512, 512, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const any192 = await sharp(anyMaster)
    .resize(192, 192, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()

  async function makeMaskable(size) {
    const logoSize = Math.round(size * MASKABLE_FIT)
    const logoRadius = Math.max(1, Math.round(radius * (logoSize / extract.width)))
    const logo = await sharp(anyMaster)
      .resize(logoSize, logoSize, { fit: 'fill' })
      .png()
      .toBuffer()
    const maskedLogo = await applyRoundedMask(logo, logoSize, logoRadius)
    const leftPad = Math.round((size - logoSize) / 2)
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: maskedLogo, left: leftPad, top: leftPad }])
      .flatten({ background: '#ffffff' })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer()
  }

  const mask512 = await makeMaskable(512)
  const mask192 = await makeMaskable(192)

  const heroPng = await sharp(anyMaster).png({ compressionLevel: 9 }).toBuffer()
  const heroWebp = await sharp(anyMaster).webp({ quality: 92 }).toBuffer()

  const teacher = {
    'hyper-teacher-icon-v11-192.png': any192,
    'hyper-teacher-icon-v11-512.png': any512,
    'hyper-teacher-icon-maskable-v11-192.png': mask192,
    'hyper-teacher-icon-maskable-v11-512.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-v11-192.png': any192,
    'hyper-parent-icon-v11-512.png': any512,
    'hyper-parent-icon-maskable-v11-192.png': mask192,
    'hyper-parent-icon-maskable-v11-512.png': mask512,
  }
  const hub = {
    'hyper-hub-icon-v11-192.png': any192,
    'hyper-hub-icon-v11-512.png': any512,
    'hyper-hub-icon-maskable-v11-192.png': mask192,
    'hyper-hub-icon-maskable-v11-512.png': mask512,
  }

  for (const [name, buf] of Object.entries(teacher)) {
    await writePng(join(root, 'public', 'teacher', name), buf)
  }
  for (const [name, buf] of Object.entries(parent)) {
    await writePng(join(root, 'public', 'care', name), buf)
  }
  for (const [name, buf] of Object.entries(hub)) {
    await writePng(join(root, 'public', 'hub', name), buf)
  }
  await writePng(join(root, 'public', 'hub', 'hyper-academy-logo-v11.png'), heroPng)
  writeFileSync(join(root, 'public', 'hub', 'hyper-academy-logo-v11.webp'), heroWebp)
  console.log('wrote /public/hub/hyper-academy-logo-v11.webp', heroWebp.length)

  const circleMask = await sharp(circleSvg(512)).png().toBuffer()
  const circlePreview = await sharp(mask512)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  await writePng(join(PREVIEW_DIR, 'any-512.png'), any512)
  await writePng(join(PREVIEW_DIR, 'any-192.png'), any192)
  await writePng(join(PREVIEW_DIR, 'maskable-512.png'), mask512)
  await writePng(join(PREVIEW_DIR, 'maskable-192.png'), mask192)
  await writePng(join(PREVIEW_DIR, 'maskable-512-circle-crop.png'), circlePreview)
  await writePng(join(PREVIEW_DIR, 'hero.png'), heroPng)

  for (const [label, buf, expected] of [
    ['any-192', any192, 192],
    ['any-512', any512, 512],
    ['mask-192', mask192, 192],
    ['mask-512', mask512, 512],
  ]) {
    const meta = await sharp(buf).metadata()
    assertSquare(meta, label)
    if (meta.width !== expected) throw new Error(`${label} width ${meta.width} != ${expected}`)
  }

  console.log('done v11')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
