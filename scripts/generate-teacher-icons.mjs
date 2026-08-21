/**
 * Generate HYPER TEACHER PWA icons (black / silver premium).
 * Run: node scripts/generate-teacher-icons.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'teacher')
const VERSION = 'v16'

/**
 * Full-bleed square icon.
 * Safe area ~16% inset so iPhone squircle / Android maskable do not clip text.
 */
function buildSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="#141416"/>
      <stop offset="45%" stop-color="#0B0B0D"/>
      <stop offset="100%" stop-color="#050506"/>
    </linearGradient>
    <linearGradient id="border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F2F2F4"/>
      <stop offset="35%" stop-color="#C8C8D0"/>
      <stop offset="70%" stop-color="#8E8E98"/>
      <stop offset="100%" stop-color="#D8D8E0"/>
    </linearGradient>
    <linearGradient id="hFill" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="#F7F7F9"/>
      <stop offset="40%" stop-color="#D0D0D8"/>
      <stop offset="100%" stop-color="#9A9AA4"/>
    </linearGradient>
    <linearGradient id="hyperFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F4F4F6"/>
      <stop offset="100%" stop-color="#C6C6CE"/>
    </linearGradient>
    <linearGradient id="teacherFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C8C8D0"/>
      <stop offset="100%" stop-color="#9B9BA5"/>
    </linearGradient>
    <radialGradient id="sheen" cx="50%" cy="28%" r="62%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.07"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </radialGradient>
  </defs>

  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#sheen)"/>

  <!-- Thin metallic frame, inset so OS rounding keeps it visible -->
  <rect x="36" y="36" width="952" height="952" fill="none" stroke="url(#border)" stroke-width="5" opacity="0.92"/>
  <rect x="48" y="48" width="928" height="928" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.5"/>

  <!--
    Safe content band: ~x 170–854 (≈16.5% margin), vertical stack centered slightly above mid.
    H / HYPER / TEACHER stay well inside iPhone home-screen squircle.
  -->
  <g font-family="Arial, Helvetica Neue, Helvetica, sans-serif" text-anchor="middle">
    <text
      x="512"
      y="430"
      fill="url(#hFill)"
      font-size="268"
      font-weight="700"
      font-style="italic"
      letter-spacing="-6"
    >H</text>

    <text
      x="512"
      y="560"
      fill="url(#hyperFill)"
      font-size="92"
      font-weight="700"
      font-style="italic"
      letter-spacing="10"
    >HYPER</text>

    <text
      x="512"
      y="640"
      fill="url(#teacherFill)"
      font-size="42"
      font-weight="600"
      letter-spacing="14"
    >TEACHER</text>
  </g>
</svg>`
}

async function renderPng(size, filename) {
  const svg = buildSvg()
  const out = join(outDir, filename)
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log('wrote', filename, size)
}

async function main() {
  const svg = buildSvg()
  writeFileSync(join(outDir, `hyper-teacher-favicon-${VERSION}.svg`), svg)

  await renderPng(512, `hyper-teacher-icon-512-${VERSION}.png`)
  await renderPng(512, `hyper-teacher-maskable-512-${VERSION}.png`)
  await renderPng(512, `hyper-teacher-splash-${VERSION}.png`)
  await renderPng(192, `hyper-teacher-icon-192-${VERSION}.png`)
  await renderPng(180, `hyper-teacher-apple-touch-${VERSION}.png`)
  await renderPng(32, `hyper-teacher-favicon-32-${VERSION}.png`)
  await renderPng(16, `hyper-teacher-favicon-16-${VERSION}.png`)

  // Keep legacy filenames in sync as fallback for any hard-coded refs
  await renderPng(512, 'pwa-512.png')
  await renderPng(512, 'maskable-512.png')
  await renderPng(512, 'splash-icon.png')
  await renderPng(192, 'pwa-192.png')
  await renderPng(180, 'apple-touch-icon.png')
  await renderPng(32, 'favicon-32.png')
  await renderPng(16, 'favicon-16.png')
  writeFileSync(join(outDir, 'favicon.svg'), svg)

  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
