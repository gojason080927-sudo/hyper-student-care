/**
 * v18 Galaxy WebAPK preview from the attached source.
 * Run: node scripts/generate-preview-v18.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from './chrome-webapk-icon-spec.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', '_preview-v18')
mkdirSync(outDir, { recursive: true })

const SRC = join(root, 'public', 'hyper-academy-logo-source-v18.png')
const V18 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v18-512.png')

async function padIcon(src, padRatio) {
  const meta = await sharp(src).metadata()
  const padding = Math.round(padRatio * meta.width)
  const outer = meta.width + 2 * padding
  return sharp({
    create: { width: outer, height: outer, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: src, left: padding, top: padding }])
    .png()
    .toBuffer()
}

async function flatten(src, bg) {
  const meta = await sharp(src).metadata()
  return sharp({
    create: { width: meta.width, height: meta.height, channels: 3, background: bg },
  })
    .composite([{ input: await sharp(src).ensureAlpha().png().toBuffer() }])
    .png()
    .toBuffer()
}

async function viewportOf(srcPath) {
  const padded = await padIcon(srcPath, MASKABLE_ICON_PADDING_RATIO)
  const paddedMeta = await sharp(padded).metadata()
  const viewport = (paddedMeta.width * VIEW_PORT_SCALE) | 0
  const origin = ((paddedMeta.width - viewport) / 2) | 0
  return flatten(
    await sharp(padded).extract({ left: origin, top: origin, width: viewport, height: viewport }).png().toBuffer(),
    { r: 254, g: 254, b: 254 },
  )
}

async function samsungSquircle(size) {
  const r = 0.2 * size
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function applyMask(src, mask) {
  return sharp(src).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function onWallpaper(src, size) {
  const resized = await sharp(src).resize(size, size).png().toBuffer()
  const pad = Math.round(size * 0.22)
  return sharp({
    create: { width: size + pad * 2, height: size + pad * 2, channels: 3, background: { r: 20, g: 24, b: 32 } },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toBuffer()
}

async function labeled(src, title, size = 320) {
  const img = await sharp(src).resize(size, size).png().toBuffer()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="40"><text x="50%" y="28" text-anchor="middle" fill="#d7dde8" font-size="16" font-family="sans-serif">${title}</text></svg>`
  return sharp({
    create: { width: size + 28, height: size + 68, channels: 3, background: { r: 12, g: 14, b: 20 } },
  })
    .composite([
      { input: img, left: 14, top: 14 },
      { input: Buffer.from(svg), left: 14, top: 14 + size },
    ])
    .png()
    .toBuffer()
}

async function main() {
  const raw = await sharp(V18).png().toBuffer()
  const source = await sharp(SRC).resize(512, 512).png().toBuffer()
  const viewport = await viewportOf(V18)
  const galaxy = await applyMask(await sharp(viewport).resize(256, 256).png().toBuffer(), await samsungSquircle(256))
  const home48 = await onWallpaper(
    await applyMask(await sharp(viewport).resize(48, 48).png().toBuffer(), await samsungSquircle(48)),
    48,
  )
  writeFileSync(join(outDir, 'source.png'), source)
  writeFileSync(join(outDir, 'v18-raw.png'), raw)
  writeFileSync(join(outDir, 'v18-viewport.png'), viewport)
  writeFileSync(join(outDir, 'v18-galaxy.png'), galaxy)
  writeFileSync(join(outDir, 'v18-home-48.png'), home48)
  const cells = [
    await labeled(source, 'attached source'),
    await labeled(raw, 'v18 512 canvas #FEFEFE'),
    await labeled(viewport, 'Chrome 446 viewport'),
    await labeled(galaxy, 'Galaxy squircle'),
  ]
  const metas = []
  for (const cell of cells) metas.push(await sharp(cell).metadata())
  let left = 16
  const composites = []
  for (let i = 0; i < cells.length; i++) {
    composites.push({ input: cells[i], left, top: 16 })
    left += metas[i].width + 16
  }
  const board = await sharp({
    create: {
      width: metas.reduce((sum, m) => sum + m.width, 0) + 16 * (cells.length + 1),
      height: Math.max(...metas.map((m) => m.height)) + 32,
      channels: 3,
      background: { r: 12, g: 14, b: 20 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer()
  writeFileSync(join(outDir, 'v18-pipeline.png'), board)
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><title>v18 attached source</title>
<style>body{margin:24px;background:#0c0e14;color:#d7dde8;font-family:sans-serif}img{background:#12141a;max-width:100%}</style></head>
<body>
<h1>v18 — attached HYPER on measured #FEFEFE</h1>
<p>Canvas and source background are RGB(254,254,254). Mark is the attached PNG, uniformly scaled into the 446 viewport at the largest squircle-safe size (376×408 @ 68,52).</p>
<p><img src="v18-pipeline.png" alt="v18 pipeline"/></p>
<p>48dp home <img src="v18-home-48.png" alt="48dp"/></p>
</body></html>`,
  )
  console.log('wrote public/_preview-v18')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
