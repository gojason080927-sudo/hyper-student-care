/**
 * HYPER TEACHER PWA 프리미엄 아이콘 생성
 * 실행: node scripts/generate-teacher-pwa-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/teacher')
const ICON_VERSION = 4

const NAVY_TOP = '#081C45'
const CYAN = '#00D7FF'

/** @param {number} size @param {{ maskable?: boolean }} opts */
function buildSvg(size, { maskable = false } = {}) {
  const pad = maskable ? Math.round(size * 0.12) : 0
  const inner = size - pad * 2
  const cx = size / 2
  const radius = maskable ? 0 : Math.round(size * 0.223)

  const hyperSize = Math.round(inner * 0.3)
  const teacherSize = Math.round(inner * 0.105)
  const hyperY = pad + inner * 0.43
  const teacherY = pad + inner * 0.72
  const hyperTracking = Math.max(1, Math.round(hyperSize * 0.03))
  const teacherTracking = Math.max(3, Math.round(teacherSize * 0.18))

  const arcCx = cx
  const arcCy = pad + inner * 1.02
  const arcRx = inner * 0.62
  const arcRy = inner * 0.38
  const blur = Math.max(2, Math.round(size * 0.028))
  const arcBlur = Math.max(6, Math.round(size * 0.055))
  const flareCx = cx + inner * 0.28
  const flareCy = hyperY - hyperSize * 0.55
  const flareR = Math.max(3, Math.round(size * 0.022))

  const uid = maskable ? 'm' : 'a'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${NAVY_TOP}"/>
      <stop offset="55%" stop-color="#0B2F6E"/>
      <stop offset="100%" stop-color="${CYAN}"/>
    </linearGradient>
    <linearGradient id="hyper-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="45%" stop-color="#E8FDFF"/>
      <stop offset="100%" stop-color="${CYAN}"/>
    </linearGradient>
    <linearGradient id="teacher-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#B8F4FF" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="vignette-${uid}" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
    </radialGradient>
    <filter id="arcGlow-${uid}" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="${arcBlur}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow-${uid}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${blur}" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="flare-${uid}">
      <feGaussianBlur stdDeviation="${Math.max(1, Math.round(flareR * 0.6))}"/>
    </filter>
  </defs>

  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg-${uid})"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#vignette-${uid})"/>

  <ellipse cx="${arcCx}" cy="${arcCy}" rx="${arcRx}" ry="${arcRy}" fill="${CYAN}" opacity="0.55" filter="url(#arcGlow-${uid})"/>
  <ellipse cx="${arcCx}" cy="${arcCy + arcRy * 0.15}" rx="${arcRx * 0.72}" ry="${arcRy * 0.55}" fill="#7AEFFF" opacity="0.35" filter="url(#arcGlow-${uid})"/>

  <g filter="url(#textGlow-${uid})">
    <g transform="translate(${cx} ${hyperY}) skewX(-10) translate(${-cx} ${-hyperY})">
      <text x="${cx}" y="${hyperY}" fill="url(#hyper-${uid})" font-family="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif" font-size="${hyperSize}" font-weight="800" font-style="italic" text-anchor="middle" letter-spacing="${hyperTracking}">HYPER</text>
    </g>
    <text x="${cx}" y="${teacherY}" fill="url(#teacher-${uid})" font-family="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif" font-size="${teacherSize}" font-weight="700" text-anchor="middle" letter-spacing="${teacherTracking}">TEACHER</text>
  </g>

  <circle cx="${flareCx}" cy="${flareCy}" r="${flareR}" fill="#FFFFFF" opacity="0.95" filter="url(#flare-${uid})"/>
  <circle cx="${flareCx + flareR * 0.35}" cy="${flareCy - flareR * 0.25}" r="${Math.max(1, Math.round(flareR * 0.35))}" fill="#E0FFFF" opacity="0.8" filter="url(#flare-${uid})"/>
</svg>`
}

async function writePng(filename, size, options) {
  const svg = buildSvg(size, options)
  const path = join(outDir, filename)
  await sharp(Buffer.from(svg)).png().toFile(path)
  console.log('wrote', path)
}

async function writeSvg(filename, size, options) {
  const svg = buildSvg(size, options)
  const path = join(outDir, filename)
  writeFileSync(path, svg)
  console.log('wrote', path)
}

await writePng('pwa-512.png', 512)
await writePng('pwa-192.png', 192)
await writePng('maskable-512.png', 512, { maskable: true })
await writePng('apple-touch-icon.png', 180)
await writePng('splash-icon.png', 512)
await writePng('favicon-32.png', 32)
await writePng('favicon-16.png', 16)
await writeSvg('favicon.svg', 512)

const manifestPath = join(outDir, 'manifest.webmanifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.theme_color = NAVY_TOP
manifest.background_color = NAVY_TOP
manifest.icons = [
  {
    src: `/teacher/pwa-192.png?v=${ICON_VERSION}`,
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: `/teacher/pwa-512.png?v=${ICON_VERSION}`,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: `/teacher/maskable-512.png?v=${ICON_VERSION}`,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: `/teacher/splash-icon.png?v=${ICON_VERSION}`,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
]
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`updated manifest icon URLs with ?v=${ICON_VERSION}`)
