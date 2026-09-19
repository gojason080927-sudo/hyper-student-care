/**
 * v19 Galaxy WebAPK preview — measured One UI n=2.6 mask.
 * Run: node scripts/generate-preview-v19.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from './chrome-webapk-icon-spec.mjs'
import { ONE_UI_SUPERELLIPSE_N } from './generate-pwa-icons-v19.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', '_preview-v19')
mkdirSync(outDir, { recursive: true })

const V18 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v18-512.png')
const V19 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v19-512.png')

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

async function oneUiMask(size) {
  const n = ONE_UI_SUPERELLIPSE_N
  const cx = size / 2
  const cy = size / 2
  const a = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <path d="${superellipsePath(cx, cy, a, a, n)}" fill="#fff"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

function superellipsePath(cx, cy, a, b, n) {
  const steps = 180
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `${pts.join(' ')} Z`
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="40"><text x="50%" y="28" text-anchor="middle" fill="#d7dde8" font-size="15" font-family="sans-serif">${title}</text></svg>`
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
  const raw18 = await sharp(V18).png().toBuffer()
  const raw19 = await sharp(V19).png().toBuffer()
  const vp18 = await viewportOf(V18)
  const vp19 = await viewportOf(V19)
  const mask256 = await oneUiMask(256)
  const galaxy18 = await applyMask(await sharp(vp18).resize(256, 256).png().toBuffer(), mask256)
  const galaxy19 = await applyMask(await sharp(vp19).resize(256, 256).png().toBuffer(), mask256)
  const home18 = await onWallpaper(
    await applyMask(await sharp(vp18).resize(48, 48).png().toBuffer(), await oneUiMask(48)),
    48,
  )
  const home19 = await onWallpaper(
    await applyMask(await sharp(vp19).resize(48, 48).png().toBuffer(), await oneUiMask(48)),
    48,
  )
  writeFileSync(join(outDir, 'v18-raw.png'), raw18)
  writeFileSync(join(outDir, 'v19-raw.png'), raw19)
  writeFileSync(join(outDir, 'v18-viewport.png'), vp18)
  writeFileSync(join(outDir, 'v19-viewport.png'), vp19)
  writeFileSync(join(outDir, 'v18-galaxy.png'), galaxy18)
  writeFileSync(join(outDir, 'v19-galaxy.png'), galaxy19)
  writeFileSync(join(outDir, 'v18-home-48.png'), home18)
  writeFileSync(join(outDir, 'v19-home-48.png'), home19)
  const cells = [
    await labeled(galaxy18, 'v18 Galaxy (clipped)'),
    await labeled(galaxy19, 'v19 Galaxy (shrunk)'),
    await labeled(raw19, 'v19 512 #FEFEFE'),
    await labeled(vp19, 'v19 Chrome 446'),
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
  writeFileSync(join(outDir, 'v19-pipeline.png'), board)
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><title>v19 shrink</title>
<style>body{margin:24px;background:#0c0e14;color:#d7dde8;font-family:sans-serif}img{background:#12141a;max-width:100%}</style></head>
<body>
<h1>v19 — same HYPER mark, smaller inside #FEFEFE</h1>
<p>Canvas stays RGB(254,254,254). Mark is the v18 source, uniformly scaled to 315×342 @ (99,85) so the AABB sits inside the measured One UI n=2.6 mask with an 8px gutter.</p>
<p><img src="v19-pipeline.png" alt="v19 pipeline"/></p>
<p>48dp v18 <img src="v18-home-48.png" alt="v18 48dp"/> 48dp v19 <img src="v19-home-48.png" alt="v19 48dp"/></p>
</body></html>`,
  )
  console.log('wrote public/_preview-v19')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
