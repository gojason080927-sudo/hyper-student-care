/**
 * 학생 Hub PWA 아이콘. 학부모/강사 아이콘을 덮어쓰지 않습니다.
 * Run: node scripts/generate-hub-pwa-icons.mjs
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'hub')
mkdirSync(outDir, { recursive: true })

function hubSvg(size, padding) {
  const inset = Math.round(size * padding)
  const inner = size - inset * 2
  const stroke = Math.max(8, Math.round(size * 0.045))
  const bar = Math.round(inner * 0.18)
  const gap = Math.round(inner * 0.22)
  const x = inset + Math.round((inner - (bar * 2 + gap)) / 2)
  const y = inset + Math.round(inner * 0.18)
  const h = Math.round(inner * 0.64)
  const midY = y + Math.round(h * 0.42)
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0B1F4A"/>
  <rect x="${x}" y="${y}" width="${bar}" height="${h}" rx="${Math.round(bar / 3)}" fill="#28C7B7"/>
  <rect x="${x + bar + gap}" y="${y}" width="${bar}" height="${h}" rx="${Math.round(bar / 3)}" fill="#28C7B7"/>
  <rect x="${x}" y="${midY}" width="${bar * 2 + gap}" height="${stroke}" rx="${Math.round(stroke / 2)}" fill="#E8FFF9"/>
</svg>`
}

async function writePng(name, size, padding) {
  const png = await sharp(Buffer.from(hubSvg(size, padding))).png().toBuffer()
  await sharp(png).toFile(join(outDir, name))
}

await writePng('hyper-hub-icon-v1-192.png', 192, 0.18)
await writePng('hyper-hub-icon-v1-512.png', 512, 0.18)
await writePng('hyper-hub-icon-maskable-v1-192.png', 192, 0.24)
await writePng('hyper-hub-icon-maskable-v1-512.png', 512, 0.24)

console.log('wrote hub PWA icons to public/hub')
