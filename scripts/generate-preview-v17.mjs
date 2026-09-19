/**
 * v16 vs v17 Galaxy WebAPK preview.
 * Run: node scripts/generate-preview-v17.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromeAdaptiveViewport, MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from './chrome-webapk-icon-spec.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', '_preview-v17')
mkdirSync(outDir, { recursive: true })

const V16 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v16-512.png')
const V17 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v17-512.png')

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

async function flattenOnBlack(src) {
  const meta = await sharp(src).metadata()
  return sharp({
    create: { width: meta.width, height: meta.height, channels: 3, background: { r: 0, g: 0, b: 0 } },
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
  return flattenOnBlack(
    await sharp(padded).extract({ left: origin, top: origin, width: viewport, height: viewport }).png().toBuffer(),
  )
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
  return sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path fill="#fff" d="${pts.join(' ')} Z"/></svg>`),
  )
    .png()
    .toBuffer()
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

async function labeled(src, title, size = 280) {
  const img = await sharp(src).resize(size, size).png().toBuffer()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="36"><text x="50%" y="26" text-anchor="middle" fill="#d7dde8" font-size="15" font-family="sans-serif">${title}</text></svg>`
  return sharp({
    create: { width: size + 28, height: size + 64, channels: 3, background: { r: 12, g: 14, b: 20 } },
  })
    .composite([
      { input: img, left: 14, top: 14 },
      { input: Buffer.from(svg), left: 14, top: 14 + size },
    ])
    .png()
    .toBuffer()
}

async function pipeline(srcPath) {
  const raw = await sharp(srcPath).png().toBuffer()
  const viewport = await viewportOf(srcPath)
  const galaxy = await applyMask(await sharp(viewport).resize(256, 256).png().toBuffer(), await samsungSquircle(256))
  const home48 = await onWallpaper(await applyMask(await sharp(viewport).resize(48, 48).png().toBuffer(), await samsungSquircle(48)), 48)
  return { raw, viewport, galaxy, home48 }
}

async function main() {
  const v16 = await pipeline(V16)
  const v17 = await pipeline(V17)
  writeFileSync(join(outDir, 'v16-raw.png'), v16.raw)
  writeFileSync(join(outDir, 'v17-raw.png'), v17.raw)
  writeFileSync(join(outDir, 'v16-galaxy.png'), v16.galaxy)
  writeFileSync(join(outDir, 'v17-galaxy.png'), v17.galaxy)
  writeFileSync(join(outDir, 'v16-home-48.png'), v16.home48)
  writeFileSync(join(outDir, 'v17-home-48.png'), v17.home48)
  const left = await labeled(v16.galaxy, 'v16 Galaxy')
  const right = await labeled(v17.galaxy, 'v17 Galaxy — enlarged in black')
  const lm = await sharp(left).metadata()
  const rm = await sharp(right).metadata()
  const board = await sharp({
    create: { width: lm.width + rm.width + 48, height: Math.max(lm.height, rm.height) + 32, channels: 3, background: { r: 12, g: 14, b: 20 } },
  })
    .composite([
      { input: left, left: 16, top: 16 },
      { input: right, left: 32 + lm.width, top: 16 },
    ])
    .png()
    .toBuffer()
  writeFileSync(join(outDir, 'v16-vs-v17-galaxy.png'), board)
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><title>v17 enlarge</title>
<style>body{margin:24px;background:#0c0e14;color:#d7dde8;font-family:sans-serif}img{background:#12141a}</style></head>
<body><h1>v17 — enlarge HYPER inside the black 446 viewport</h1>
<p><img src="v16-vs-v17-galaxy.png" alt="v16 vs v17"/></p>
<p>v16 48dp <img src="v16-home-48.png"/> v17 48dp <img src="v17-home-48.png"/></p>
</body></html>`,
  )
  console.log('wrote public/_preview-v17', chromeAdaptiveViewport(512))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
