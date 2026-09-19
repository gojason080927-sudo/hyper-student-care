/**
 * v16 Chrome WebAPK pipeline preview.
 * Shows raw 512, Chrome adaptive viewport (446), Galaxy squircle of that viewport.
 * Run: node scripts/generate-preview-v16.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromeAdaptiveViewport, MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from './chrome-webapk-icon-spec.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', '_preview-v16')
mkdirSync(outDir, { recursive: true })

const V15 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v15-512.png')
const V16 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v16-512.png')

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

async function flattenOnBlack(src) {
  const meta = await sharp(src).metadata()
  return sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([{ input: await sharp(src).ensureAlpha().png().toBuffer() }])
    .png()
    .toBuffer()
}

async function cropViewport(src) {
  const meta = await sharp(src).metadata()
  const spec = chromeAdaptiveViewport(meta.width)
  const padded = await padIcon(src, MASKABLE_ICON_PADDING_RATIO)
  const paddedMeta = await sharp(padded).metadata()
  const viewport = (paddedMeta.width * VIEW_PORT_SCALE) | 0
  const origin = ((paddedMeta.width - viewport) / 2) | 0
  const cropped = await sharp(padded).extract({ left: origin, top: origin, width: viewport, height: viewport }).png().toBuffer()
  return { cropped, spec, padded }
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

async function labeled(src, title, size = 280) {
  const img = await sharp(src).resize(size, size).png().toBuffer()
  const pad = 14
  const labelH = 40
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${labelH}">
    <text x="50%" y="28" text-anchor="middle" fill="#d7dde8" font-size="15" font-family="sans-serif">${title}</text>
  </svg>`
  return sharp({
    create: {
      width: size + pad * 2,
      height: size + labelH + pad * 2,
      channels: 3,
      background: { r: 12, g: 14, b: 20 },
    },
  })
    .composite([
      { input: img, left: pad, top: pad },
      { input: Buffer.from(svg), left: pad, top: pad + size },
    ])
    .png()
    .toBuffer()
}

async function row(cells) {
  const metas = []
  for (const cell of cells) metas.push(await sharp(cell).metadata())
  const gap = 16
  const width = metas.reduce((sum, m) => sum + m.width, 0) + gap * (cells.length + 1)
  const height = Math.max(...metas.map((m) => m.height)) + gap * 2
  const composites = []
  let left = gap
  for (let i = 0; i < cells.length; i++) {
    composites.push({ input: cells[i], left, top: gap })
    left += metas[i].width + gap
  }
  return sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 14, b: 20 } },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

async function pipeline(srcPath) {
  const raw = await sharp(srcPath).png().toBuffer()
  const { cropped, spec, padded } = await cropViewport(srcPath)
  const viewport = await flattenOnBlack(cropped)
  const paddedFlat = await flattenOnBlack(padded)
  const galaxySrc = await sharp(viewport).resize(256, 256).png().toBuffer()
  const galaxy = await applyMask(galaxySrc, await samsungSquircle(256))
  const galaxy48 = await applyMask(
    await sharp(viewport).resize(48, 48).png().toBuffer(),
    await samsungSquircle(48),
  )
  const galaxy48Home = await onWallpaper(galaxy48, 48)
  return { raw, paddedFlat, viewport, galaxy, galaxy48Home, spec }
}

async function main() {
  const v15 = await pipeline(V15)
  const v16 = await pipeline(V16)
  writeFileSync(join(outDir, 'v15-raw.png'), v15.raw)
  writeFileSync(join(outDir, 'v16-raw.png'), v16.raw)
  writeFileSync(join(outDir, 'v16-chrome-padded.png'), v16.paddedFlat)
  writeFileSync(join(outDir, 'v16-chrome-viewport.png'), v16.viewport)
  writeFileSync(join(outDir, 'v16-galaxy-squircle.png'), v16.galaxy)
  writeFileSync(join(outDir, 'v16-galaxy-48dp.png'), v16.galaxy48Home)
  writeFileSync(join(outDir, 'v15-chrome-viewport.png'), v15.viewport)
  writeFileSync(join(outDir, 'v15-galaxy-squircle.png'), v15.galaxy)

  const board = await row([
    await labeled(v15.raw, 'v15 raw 512'),
    await labeled(v15.viewport, 'v15 Chrome 446 viewport'),
    await labeled(v15.galaxy, 'v15 Galaxy squircle'),
    await labeled(v16.raw, 'v16 raw 512'),
    await labeled(v16.viewport, 'v16 Chrome 446 viewport'),
    await labeled(v16.galaxy, 'v16 Galaxy squircle'),
  ])
  writeFileSync(join(outDir, 'v15-vs-v16-webapk.png'), board)
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><title>HYPER icon v16 WebAPK spec</title>
<style>body{margin:24px;background:#0c0e14;color:#d7dde8;font-family:sans-serif;max-width:1200px}
img{max-width:100%;background:#12141a}code{color:#f3d19e}h1,h2{font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
figure{margin:0}figcaption{margin-top:8px;font-size:13px;color:#9aa3b2}</style>
</head><body>
<h1>v16 — Chrome WebAPK adaptive viewport</h1>
<p>Chromium <code>MASKABLE_ICON_PADDING_RATIO = ((4/5)/(66/108)-1)/2</code>.
For a 512 source: padding=79, padded=670, AdaptiveIconDrawable viewport=<code>(670*2/3)|0 = 446</code>, origin=33.
Galaxy One UI masks that 446px crop. This is not a guessed 56.6 / 70 / 80 / 90% scale.</p>
<p><img src="v15-vs-v16-webapk.png" alt="v15 vs v16 WebAPK pipeline"/></p>
<h2>v16 stages</h2>
<div class="grid">
<figure><img src="v16-raw.png"/><figcaption>1. Raw 512 — black field to the edge</figcaption></figure>
<figure><img src="v16-chrome-padded.png"/><figcaption>2. Chrome maskable pad 79px (transparent)</figcaption></figure>
<figure><img src="v16-chrome-viewport.png"/><figcaption>3. Adaptive viewport 446px — what Android shows</figcaption></figure>
<figure><img src="v16-galaxy-squircle.png"/><figcaption>4. Galaxy One UI squircle of #3</figcaption></figure>
<figure><img src="v16-galaxy-48dp.png"/><figcaption>5. ~48dp home tile</figcaption></figure>
</div>
</body></html>`,
  )
  console.log('wrote public/_preview-v16', v16.spec)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
