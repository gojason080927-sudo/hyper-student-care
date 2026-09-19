/**
 * v15 vs v16 fill comparison. Run: node scripts/generate-preview-v16.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', '_preview-v16')
mkdirSync(outDir, { recursive: true })

const V15 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v15-512.png')
const V16 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v16-512.png')

async function labeled(src, title, size = 360) {
  const img = await sharp(src).resize(size, size).png().toBuffer()
  const pad = 16
  const labelH = 40
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${labelH}">
    <text x="50%" y="28" text-anchor="middle" fill="#d7dde8" font-size="18" font-family="sans-serif">${title}</text>
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

async function main() {
  const left = await labeled(V15, 'v15 — small badge, wide black margin')
  const right = await labeled(V16, 'v16 — logo fills the black canvas')
  const lm = await sharp(left).metadata()
  const rm = await sharp(right).metadata()
  const gap = 20
  const board = await sharp({
    create: {
      width: lm.width + rm.width + gap * 3,
      height: Math.max(lm.height, rm.height) + gap * 2,
      channels: 3,
      background: { r: 12, g: 14, b: 20 },
    },
  })
    .composite([
      { input: left, left: gap, top: gap },
      { input: right, left: gap * 2 + lm.width, top: gap },
    ])
    .png()
    .toBuffer()
  writeFileSync(join(outDir, 'v15-raw.png'), await sharp(V15).png().toBuffer())
  writeFileSync(join(outDir, 'v16-raw.png'), await sharp(V16).png().toBuffer())
  writeFileSync(join(outDir, 'v15-vs-v16-fill.png'), board)
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><title>HYPER icon v16 fill</title>
<style>body{margin:24px;background:#0c0e14;color:#d7dde8;font-family:sans-serif}img{max-width:100%;background:#12141a}</style>
</head><body>
<h1>v16 — logo fills the black canvas</h1>
<p><img src="v15-vs-v16-fill.png" alt="v15 vs v16"/></p>
<h2>v16 final icon</h2>
<p><img src="v16-raw.png" width="512" height="512" alt="v16"/></p>
</body></html>`,
  )
  console.log('wrote public/_preview-v16')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
