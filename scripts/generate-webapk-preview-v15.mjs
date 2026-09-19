/**
 * WebAPK-pipeline previews for v14 vs v15.
 *
 * Models Chromium WebappsIconUtils (not a naive raw-PNG squircle):
 * - any + opaque corners → ICON_PADDING_RATIO = 2/44, flatten on white
 * - maskable → MASKABLE_ICON_PADDING_RATIO ≈ 15.45%
 * - generateAdaptiveIconBitmap → maskable pad + AdaptiveIconDrawable
 *   viewport scale 2/3, then One UI squircle
 *
 * Run: node scripts/generate-webapk-preview-v15.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', '_preview-v15')
mkdirSync(outDir, { recursive: true })

const ICON_PADDING_RATIO = 2 / 44
const MASKABLE_SAFE_ZONE_RATIO = 4 / 5
const ADAPTIVE_SAFE_ZONE_RATIO = 66 / 108
const MASKABLE_ICON_PADDING_RATIO =
  (MASKABLE_SAFE_ZONE_RATIO / ADAPTIVE_SAFE_ZONE_RATIO - 1) / 2
const VIEWPORT_SCALE = 2 / 3

const V14 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v14-512.png')
const V15 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v15-512.png')

async function padIcon(src, padRatio) {
  const meta = await sharp(src).metadata()
  const inner = meta.width
  const padding = Math.round(padRatio * inner)
  const outer = inner + 2 * padding
  return sharp({
    create: { width: outer, height: outer, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: src, left: padding, top: padding }])
    .png()
    .toBuffer()
}

async function flattenOnWhite(src) {
  const meta = await sharp(src).metadata()
  return sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: await sharp(src).ensureAlpha().png().toBuffer() }])
    .png()
    .toBuffer()
}

async function cropCenterRatio(src, ratio) {
  const meta = await sharp(src).metadata()
  const side = Math.round(meta.width * ratio)
  const left = Math.round((meta.width - side) / 2)
  return sharp(src).extract({ left, top: left, width: side, height: side }).png().toBuffer()
}

async function samsungSquircle(size) {
  const mid = size / 2
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path fill="#fff" d="${pts.join(' ')} Z"/></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function applyMask(src, mask) {
  return sharp(src)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function onWallpaper(src, size = 192) {
  const resized = await sharp(src).resize(size, size).png().toBuffer()
  const pad = Math.round(size * 0.22)
  const board = size + pad * 2
  return sharp({
    create: { width: board, height: board, channels: 3, background: { r: 20, g: 24, b: 32 } },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toBuffer()
}

async function pipeline(srcPath) {
  const raw = await sharp(srcPath).png().toBuffer()
  const anyPadded = await padIcon(raw, ICON_PADDING_RATIO)
  const anyLegacy = await flattenOnWhite(anyPadded)
  const maskPadded = await padIcon(raw, MASKABLE_ICON_PADDING_RATIO)
  const maskPaddedWhite = await flattenOnWhite(maskPadded)
  const adaptiveViewport = await cropCenterRatio(maskPadded, VIEWPORT_SCALE)
  const adaptiveFlat = await flattenOnWhite(adaptiveViewport)
  const galaxySrc = await sharp(adaptiveFlat).resize(256, 256).png().toBuffer()
  const galaxy = await applyMask(galaxySrc, await samsungSquircle(256))
  const galaxy48 = await applyMask(
    await sharp(adaptiveFlat).resize(48, 48).png().toBuffer(),
    await samsungSquircle(48),
  )
  const galaxy48Home = await onWallpaper(galaxy48, 48)
  const settings = await onWallpaper(galaxy, 192)
  return { raw, anyLegacy, maskPaddedWhite, adaptiveFlat, galaxy, galaxy48, galaxy48Home, settings }
}

async function write(name, buf) {
  const path = join(outDir, name)
  writeFileSync(path, buf)
  console.log('wrote', name, buf.length)
}

async function labeledRow(cells, labels, cell = 220) {
  const gap = 16
  const labelH = 36
  const width = cells.length * cell + (cells.length + 1) * gap
  const height = cell + labelH + gap * 2
  const composites = []
  for (let i = 0; i < cells.length; i++) {
    const left = gap + i * (cell + gap)
    composites.push({
      input: await sharp(cells[i]).resize(cell, cell, { fit: 'contain', background: { r: 18, g: 20, b: 26 } }).png().toBuffer(),
      left,
      top: gap,
    })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${labelH}">
      <text x="50%" y="24" text-anchor="middle" fill="#d7dde8" font-size="14" font-family="sans-serif">${labels[i]}</text>
    </svg>`
    composites.push({ input: Buffer.from(svg), left, top: gap + cell })
  }
  return sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 14, b: 20 } },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

async function stack(images) {
  const metas = []
  for (const img of images) metas.push(await sharp(img).metadata())
  const width = Math.max(...metas.map((m) => m.width))
  const height = metas.reduce((sum, m) => sum + m.height, 0)
  const composites = []
  let top = 0
  for (let i = 0; i < images.length; i++) {
    composites.push({ input: images[i], left: Math.round((width - metas[i].width) / 2), top })
    top += metas[i].height
  }
  return sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 14, b: 20 } },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

async function main() {
  const v14 = await pipeline(V14)
  const v15 = await pipeline(V15)

  await write('v14-1-raw.png', v14.raw)
  await write('v14-2-any-legacy-white.png', v14.anyLegacy)
  await write('v14-3-maskable-padded.png', v14.maskPaddedWhite)
  await write('v14-4-adaptive-viewport.png', v14.adaptiveFlat)
  await write('v14-5-galaxy-squircle.png', v14.galaxy)
  await write('v14-6-galaxy-48dp.png', v14.galaxy48Home)
  await write('v14-7-settings.png', v14.settings)

  await write('v15-1-raw.png', v15.raw)
  await write('v15-2-any-legacy-white.png', v15.anyLegacy)
  await write('v15-3-maskable-padded.png', v15.maskPaddedWhite)
  await write('v15-4-adaptive-viewport.png', v15.adaptiveFlat)
  await write('v15-5-galaxy-squircle.png', v15.galaxy)
  await write('v15-6-galaxy-48dp.png', v15.galaxy48Home)
  await write('v15-7-settings.png', v15.settings)

  const v14Row = await labeledRow(
    [v14.raw, v14.anyLegacy, v14.maskPaddedWhite, v14.adaptiveFlat, v14.galaxy],
    ['1 raw v14', '2 any+white', '3 mask pad', '4 adaptive ~87%', '5 Galaxy / Settings'],
  )
  const v15Row = await labeledRow(
    [v15.raw, v15.anyLegacy, v15.maskPaddedWhite, v15.adaptiveFlat, v15.galaxy],
    ['1 raw v15', '2 any+white', '3 mask pad', '4 adaptive ~87%', '5 Galaxy / Settings'],
  )
  const title14 = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${(await sharp(v14Row).metadata()).width}" height="48">
    <text x="24" y="32" fill="#f3b8b8" font-size="22" font-family="sans-serif">v14 — Chrome crops to inner ~87%; visible field is the logo white page</text>
  </svg>`)
  const title15 = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${(await sharp(v15Row).metadata()).width}" height="48">
    <text x="24" y="32" fill="#b8e0c8" font-size="22" font-family="sans-serif">v15 — same Chrome path; visible field is full-bleed black + badge inside 80% circle</text>
  </svg>`)
  const board = await stack([title14, v14Row, title15, v15Row])
  await write('pipeline-v14-vs-v15.png', board)

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <title>HYPER WebAPK icon pipeline v15</title>
  <style>
    body { margin: 24px; background: #0c0e14; color: #d7dde8; font-family: sans-serif; }
    img { max-width: 100%; height: auto; background: #12141a; }
    h1,h2 { font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    figure { margin: 0; }
    figcaption { margin-top: 8px; font-size: 13px; color: #9aa3b2; }
  </style>
</head>
<body>
  <h1>WebAPK pipeline — not a raw squircle</h1>
  <p>Source: Chromium <code>WebappsIconUtils</code>. Maskable icons are padded then drawn as <code>AdaptiveIconDrawable</code>. Galaxy home and Samsung Settings both use that adaptive resource, so they match.</p>
  <p><img src="pipeline-v14-vs-v15.png" alt="v14 vs v15 pipeline"/></p>
  <h2>v15 stages</h2>
  <div class="grid">
    <figure><img src="v15-1-raw.png"/><figcaption>1. Raw source (what the PNG contains)</figcaption></figure>
    <figure><img src="v15-2-any-legacy-white.png"/><figcaption>2. purpose:any legacy — 2/44 pad + white flatten</figcaption></figure>
    <figure><img src="v15-3-maskable-padded.png"/><figcaption>3. maskable adaptive layer — 15.45% pad</figcaption></figure>
    <figure><img src="v15-4-adaptive-viewport.png"/><figcaption>4. AdaptiveIconDrawable viewport (~87% of source)</figcaption></figure>
    <figure><img src="v15-5-galaxy-squircle.png"/><figcaption>5. Galaxy One UI / Settings mask of #4</figcaption></figure>
    <figure><img src="v15-6-galaxy-48dp.png"/><figcaption>6. ~48dp home tile of #5, not a raw-PNG squircle</figcaption></figure>
  </div>
</body>
</html>`
  writeFileSync(join(outDir, 'index.html'), html)
  console.log('wrote index.html')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
