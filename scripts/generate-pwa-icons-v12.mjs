/**
 * HYPER ACADEMY PWA icon v12
 *
 * Source: approved attached PNG (no redesign).
 * any = tight crop of the black rounded-square + transparent exterior.
 * maskable / apple-touch scales are chosen after candidate comparison.
 * Does not overwrite v11 files.
 *
 * Run: node scripts/generate-pwa-icons-v12.mjs
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const ATTACHED_SOURCE =
  '/home/ubuntu/.cursor/projects/workspace/assets/6ef1f8e3-fe97-4832-80d1-fa124e559829.png'
const REPO_SOURCE = join(root, 'public', 'hyper-academy-logo-source-v12.png')
const PREVIEW = '/tmp/hyper-logo-v12-preview'

const DARK = 40
const EXTERIOR = 150
const FRAME_PAD = 4

// Chosen after candidate boards (see /tmp/hyper-logo-v12-preview).
// Maskable places the same tight-crop master used by `any` onto a
// white canvas. 86% left a ~7% white ring on Galaxy One UI. 100%
// matches `any` but clips the black frame corners on the squircle.
// 98% is the largest fit with 0 Galaxy dark/gold clip.
// 97% iOS is locked — do not change unless explicitly requested.
const MASKABLE_FIT = Number(process.env.V12_MASKABLE_FIT || '0.98')
const IOS_FIT = Number(process.env.V12_IOS_FIT || '0.97')
const WRITE_FINALS = process.env.V12_FINALS !== '0'
const MASKABLE_ONLY = process.env.V12_MASKABLE_ONLY === '1'

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

async function svgMask(size, kind) {
  const mid = size / 2
  let svg
  if (kind === 'circle') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${mid}" cy="${mid}" r="${mid}" fill="#fff"/></svg>`
  } else if (kind === 'ios') {
    const rx = Math.round(size * 0.2237)
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#fff"/></svg>`
  } else {
    const n = 5
    const pts = []
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * Math.PI * 2
      const ct = Math.cos(t)
      const st = Math.sin(t)
      const x = mid + mid * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n)
      const y = mid + mid * Math.sign(st) * Math.pow(Math.abs(st), 2 / n)
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    }
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path fill="#fff" d="${pts.join(' ')} Z"/></svg>`
  }
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function applyMask(src, size, kind) {
  const resized = await sharp(src).resize(size, size).png().toBuffer()
  const mask = await svgMask(size, kind)
  return sharp(resized).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function fitOnWhite(master, fit, size, { opaque = true } = {}) {
  const logoSize = Math.round(size * fit)
  const logo = await sharp(master).resize(logoSize, logoSize, { fit: 'fill' }).png().toBuffer()
  const left = Math.round((size - logoSize) / 2)
  const composed = sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).composite([{ input: logo, left, top: left }])
  if (opaque) return composed.flatten({ background: '#ffffff' }).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  return composed.png({ compressionLevel: 9 }).toBuffer()
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

async function board(buffers, cell, gap = 10, pad = 14) {
  const cols = buffers.length
  const width = pad * 2 + cols * cell + (cols - 1) * gap
  const height = pad * 2 + cell
  const composites = []
  for (let i = 0; i < buffers.length; i++) {
    composites.push({
      input: await sharp(buffers[i]).resize(cell, cell).png().toBuffer(),
      left: pad + i * (cell + gap),
      top: pad,
    })
  }
  return sharp({
    create: { width, height, channels: 4, background: { r: 228, g: 230, b: 234, alpha: 1 } },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

async function main() {
  mkdirSync(join(root, 'public', 'teacher'), { recursive: true })
  mkdirSync(join(root, 'public', 'care'), { recursive: true })
  mkdirSync(join(root, 'public', 'hub'), { recursive: true })
  mkdirSync(PREVIEW, { recursive: true })

  if (!MASKABLE_ONLY) copyFileSync(ATTACHED_SOURCE, REPO_SOURCE)
  const sourceMeta = await sharp(REPO_SOURCE).metadata()
  if (sourceMeta.format !== 'png' || sourceMeta.width !== 1254 || sourceMeta.height !== 1254) {
    throw new Error(`unexpected source ${sourceMeta.format} ${sourceMeta.width}x${sourceMeta.height}`)
  }
  if (sourceMeta.hasAlpha) throw new Error('source unexpectedly has alpha')

  const { data, info } = await sharp(REPO_SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const frame = bboxOf(
    data,
    info.width,
    info.height,
    info.channels,
    (r, g, b, a) => a > 8 && luma(r, g, b) <= DARK,
  )
  const padded = {
    minX: Math.max(0, frame.minX - FRAME_PAD),
    minY: Math.max(0, frame.minY - FRAME_PAD),
    maxX: Math.min(info.width - 1, frame.maxX + FRAME_PAD),
    maxY: Math.min(info.height - 1, frame.maxY + FRAME_PAD),
  }
  padded.w = padded.maxX - padded.minX + 1
  padded.h = padded.maxY - padded.minY + 1
  const side = Math.max(padded.w, padded.h)
  const extract = {
    left: Math.max(0, padded.minX - Math.floor((side - padded.w) / 2)),
    top: Math.max(0, padded.minY - Math.floor((side - padded.h) / 2)),
    width: side,
    height: side,
  }
  if (extract.left + extract.width > info.width) extract.left = info.width - extract.width
  if (extract.top + extract.height > info.height) extract.top = info.height - extract.height

  console.log(JSON.stringify({ source: sourceMeta, frame, extract, MASKABLE_FIT, IOS_FIT }, null, 2))

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

  const any512 = await sharp(anyMaster).resize(512, 512, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer()
  const any192 = await sharp(anyMaster).resize(192, 192, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer()

  const maskFits = [0.86, 0.94, 0.96, 0.98, 1]
  const iosFits = [0.94, 0.95, 0.96, 0.97, 0.98]
  const mask512 = {}
  const ios180 = {}
  for (const fit of maskFits) {
    mask512[fit] = await fitOnWhite(anyMaster, fit, 512)
    await writePng(join(PREVIEW, `maskable-${Math.round(fit * 100)}.png`), mask512[fit])
  }
  for (const fit of iosFits) {
    ios180[fit] = await fitOnWhite(anyMaster, fit, 180)
    await writePng(join(PREVIEW, `ios-${Math.round(fit * 100)}.png`), ios180[fit])
  }

  for (const kind of ['samsung', 'circle']) {
    const masked = []
    for (const fit of maskFits) masked.push(await applyMask(mask512[fit], 180, kind))
    await writePng(join(PREVIEW, `board-maskable-${kind}-180.png`), await board(masked, 180))
    const small = []
    for (const fit of maskFits) small.push(await applyMask(mask512[fit], 48, kind))
    await writePng(join(PREVIEW, `board-maskable-${kind}-48.png`), await board(small, 96))
  }
  {
    const masked = []
    for (const fit of iosFits) masked.push(await applyMask(ios180[fit], 180, 'ios'))
    await writePng(join(PREVIEW, 'board-ios-180.png'), await board(masked, 180))
    const small = []
    for (const fit of iosFits) small.push(await applyMask(ios180[fit], 60, 'ios'))
    await writePng(join(PREVIEW, 'board-ios-60.png'), await board(small, 120))
  }

  await writePng(join(PREVIEW, 'any-512.png'), any512)
  await writePng(join(PREVIEW, 'any-192.png'), any192)

  if (!WRITE_FINALS) {
    console.log('candidates only')
    return
  }
  if (!mask512[MASKABLE_FIT]) {
    throw new Error(`chosen maskable fit missing mask=${MASKABLE_FIT}`)
  }
  if (!MASKABLE_ONLY && !ios180[IOS_FIT]) {
    throw new Error(`chosen iOS fit missing ios=${IOS_FIT}`)
  }

  const mask192 = await fitOnWhite(anyMaster, MASKABLE_FIT, 192)
  const apple180 = MASKABLE_ONLY ? null : ios180[IOS_FIT]

  const teacher = {
    'hyper-teacher-icon-maskable-v12-192.png': mask192,
    'hyper-teacher-icon-maskable-v12-512.png': mask512[MASKABLE_FIT],
  }
  const parent = {
    'hyper-parent-icon-maskable-v12-192.png': mask192,
    'hyper-parent-icon-maskable-v12-512.png': mask512[MASKABLE_FIT],
  }
  const hub = {
    'hyper-hub-icon-maskable-v12-192.png': mask192,
    'hyper-hub-icon-maskable-v12-512.png': mask512[MASKABLE_FIT],
  }
  if (!MASKABLE_ONLY) {
    Object.assign(teacher, {
      'hyper-teacher-icon-v12-192.png': any192,
      'hyper-teacher-icon-v12-512.png': any512,
      'hyper-teacher-apple-touch-v12-180.png': apple180,
    })
    Object.assign(parent, {
      'hyper-parent-icon-v12-192.png': any192,
      'hyper-parent-icon-v12-512.png': any512,
      'hyper-parent-apple-touch-v12-180.png': apple180,
    })
    Object.assign(hub, {
      'hyper-hub-icon-v12-192.png': any192,
      'hyper-hub-icon-v12-512.png': any512,
      'hyper-hub-apple-touch-v12-180.png': apple180,
    })
  }
  for (const [name, buf] of Object.entries(teacher)) await writePng(join(root, 'public', 'teacher', name), buf)
  for (const [name, buf] of Object.entries(parent)) await writePng(join(root, 'public', 'care', name), buf)
  for (const [name, buf] of Object.entries(hub)) await writePng(join(root, 'public', 'hub', name), buf)

  console.log('done v12')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
