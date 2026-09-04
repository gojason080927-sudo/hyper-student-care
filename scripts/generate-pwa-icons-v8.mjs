/**
 * HYPER ACADEMY PWA icon v8 — single silver serif H on deep navy.
 * any and maskable share the same master. No HYPER/ACADEMY text.
 * Run: node scripts/generate-pwa-icons-v8.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const teacherDir = join(root, 'public', 'teacher')
const careDir = join(root, 'public', 'care')
const previewDir = join(root, 'public', '_preview-v8')
mkdirSync(teacherDir, { recursive: true })
mkdirSync(careDir, { recursive: true })
mkdirSync(previewDir, { recursive: true })

const CANVAS = 1024
const CX = CANVAS / 2
const CY = CANVAS / 2
const SAFE_RADIUS = 409

function iconHtml(fontPx) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&display=swap" rel="stylesheet"/>
<style>
  html, body { margin: 0; padding: 0; width: 1024px; height: 1024px; overflow: hidden; background: #07182E; }
  .stage {
    width: 1024px;
    height: 1024px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse 62% 58% at 50% 46%, #0B2344 0%, #081B36 54%, #07182E 100%);
  }
  .h {
    font-family: "Source Serif 4", "Times New Roman", serif;
    font-optical-sizing: auto;
    font-weight: 700;
    font-size: ${fontPx}px;
    line-height: 0.82;
    letter-spacing: -0.02em;
    margin: 0;
    padding: 0;
    transform: translate(-8px, -15px);
    background-image: linear-gradient(180deg, #E4E6EA 0%, #C8CCD1 55%, #A8AEB5 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.28));
  }
</style>
</head>
<body>
  <div class="stage"><div class="h">H</div></div>
</body>
</html>`
}

function isLogoPixel(r, g, b, a) {
  if (a < 20) return false
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma >= 88 && Math.hypot(r - 7, g - 24, b - 46) > 36
}

function analyze(data, width, height, channels) {
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let count = 0
  let maxDist = 0
  let outsideCircle = 0
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const radius = SAFE_RADIUS * (width / CANVAS)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (!isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue
      count++
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      const d = Math.hypot(x - cx, y - cy)
      if (d > maxDist) maxDist = d
      if (d > radius) outsideCircle++
    }
  }
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  return {
    count,
    bbox: { minX, minY, maxX, maxY, w: bw, h: bh },
    pctW: +((100 * bw) / width).toFixed(1),
    pctH: +((100 * bh) / height).toFixed(1),
    centerOffX: +(((minX + maxX) / 2 - cx)).toFixed(1),
    centerOffY: +(((minY + maxY) / 2 - cy)).toFixed(1),
    maxDist: +maxDist.toFixed(1),
    safeRadius: +radius.toFixed(1),
    circleMargin: +(radius - maxDist).toFixed(1),
    outsideCircle,
    insideCircle: outsideCircle === 0,
  }
}

async function inspectBuffer(buf, label) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const result = { label, ...analyze(data, info.width, info.height, info.channels) }
  console.log(JSON.stringify(result))
  return result
}

async function renderIcon(page, fontPx) {
  await page.setViewportSize({ width: CANVAS, height: CANVAS })
  await page.setContent(iconHtml(fontPx), { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForTimeout(220)
  return Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: CANVAS, height: CANVAS } }))
}

function inTarget(stats) {
  return stats.pctW >= 44 && stats.pctW <= 52 && stats.pctH >= 44 && stats.pctH <= 52
}

async function svgMask(size, kind) {
  const mid = size / 2
  let svg
  if (kind === 'circle') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${mid}" cy="${mid}" r="${mid}" fill="#fff"/></svg>`
  } else if (kind === 'rounded') {
    const rx = Math.round(size * 0.22)
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#fff"/></svg>`
  } else if (kind === 'samsung') {
    const rx = Math.round(size * 0.26)
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#fff"/></svg>`
  } else {
    const n = 5
    const a = mid
    const pts = []
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * Math.PI * 2
      const ct = Math.cos(t)
      const st = Math.sin(t)
      const x = mid + a * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n)
      const y = mid + a * Math.sign(st) * Math.pow(Math.abs(st), 2 / n)
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    }
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path fill="#fff" d="${pts.join(' ')} Z"/></svg>`
  }
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function maskedPreview(src, size, kind) {
  const resized = await sharp(src).resize(size, size).png().toBuffer()
  const mask = await svgMask(size, kind)
  const cut = await sharp(resized)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  const pad = Math.max(4, Math.round(size * 0.08))
  const board = size + pad * 2
  return sharp({
    create: { width: board, height: board, channels: 4, background: { r: 228, g: 230, b: 234, alpha: 1 } },
  })
    .composite([{ input: cut, left: pad, top: pad }])
    .png()
    .toBuffer()
}

async function writePng(path, buf) {
  writeFileSync(path, buf)
  console.log('wrote', path.replace(root, '').replaceAll('\\', '/'), buf.length)
}

async function inspectV7() {
  const files = [
    ['teacher-any-512', join(teacherDir, 'hyper-teacher-icon-v7-512.png')],
    ['teacher-mask-512', join(teacherDir, 'hyper-teacher-icon-maskable-v7-512.png')],
    ['teacher-any-192', join(teacherDir, 'hyper-teacher-icon-v7-192.png')],
    ['teacher-mask-192', join(teacherDir, 'hyper-teacher-icon-maskable-v7-192.png')],
    ['parent-any-512', join(careDir, 'hyper-parent-icon-v7-512.png')],
    ['parent-mask-512', join(careDir, 'hyper-parent-icon-maskable-v7-512.png')],
  ]
  console.log('=== v7 inspect ===')
  const stats = {}
  for (const [label, path] of files) {
    try {
      stats[label] = await inspectBuffer(await sharp(path).png().toBuffer(), `v7-${label}`)
    } catch (err) {
      console.log('missing', path, String(err.message || err))
    }
  }
  const a = stats['teacher-any-512']
  const m = stats['teacher-mask-512']
  if (a && m) {
    console.log(
      JSON.stringify({
        v7Diff: {
          anyVsMaskPctW: +(a.pctW - m.pctW).toFixed(1),
          anyVsMaskPctH: +(a.pctH - m.pctH).toFixed(1),
          anyOutsideCircle: a.outsideCircle,
          maskOutsideCircle: m.outsideCircle,
          anyCircleMargin: a.circleMargin,
          maskCircleMargin: m.circleMargin,
          sameArt: a.pctW === m.pctW && a.pctH === m.pctH,
        },
      }),
    )
  }
}

async function main() {
  await inspectV7()

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  let fontPx = 760
  let master = await renderIcon(page, fontPx)
  let stats = await inspectBuffer(master, `try-${fontPx}`)

  for (let step = 0; step < 8 && !inTarget(stats); step++) {
    const tooSmall = stats.pctW < 44 || stats.pctH < 44
    const tooBig = stats.pctW > 52 || stats.pctH > 52
    if (tooBig) fontPx = Math.round(fontPx * 0.94)
    else if (tooSmall) fontPx = Math.round(fontPx * 1.05)
    else break
    master = await renderIcon(page, fontPx)
    stats = await inspectBuffer(master, `try-${fontPx}`)
  }

  if (stats.pctH > 52 || stats.pctW > 52) {
    fontPx = Math.round(fontPx * 0.96)
    master = await renderIcon(page, fontPx)
    stats = await inspectBuffer(master, `final-try-${fontPx}`)
  }

  await browser.close()

  if (!stats.insideCircle) {
    throw new Error(`H escapes circular safe zone: outside=${stats.outsideCircle} margin=${stats.circleMargin}`)
  }
  if (stats.circleMargin < 36) {
    throw new Error(`H too close to circular safe edge: margin=${stats.circleMargin}`)
  }
  if (!inTarget(stats)) {
    console.warn('bbox slightly outside 44-52 guide', stats.pctW, stats.pctH)
  }

  const any512 = await sharp(master).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()
  const any192 = await sharp(master).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()
  const mask512 = any512
  const mask192 = any192

  await inspectBuffer(master, 'v8-master-1024')
  await inspectBuffer(any512, 'v8-any-512')
  await inspectBuffer(mask512, 'v8-mask-512-same-as-any')
  await inspectBuffer(await sharp(any512).resize(48, 48).png().toBuffer(), 'v8-any-48')

  await writePng(join(root, 'public', 'hyper-academy-icon-master-v8.png'), master)
  const teacher = {
    'hyper-teacher-icon-v8-192.png': any192,
    'hyper-teacher-icon-v8-512.png': any512,
    'hyper-teacher-icon-maskable-v8-192.png': mask192,
    'hyper-teacher-icon-maskable-v8-512.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-v8-192.png': any192,
    'hyper-parent-icon-v8-512.png': any512,
    'hyper-parent-icon-maskable-v8-192.png': mask192,
    'hyper-parent-icon-maskable-v8-512.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await writePng(join(teacherDir, name), buf)
  for (const [name, buf] of Object.entries(parent)) await writePng(join(careDir, name), buf)

  for (const kind of ['circle', 'rounded', 'squircle', 'samsung']) {
    for (const size of [192, 96, 64, 48]) {
      await writePng(
        join(previewDir, `${kind}-${size}.png`),
        await maskedPreview(master, size, kind),
      )
    }
  }
  await writePng(join(previewDir, 'plain-48.png'), await sharp(master).resize(48, 48).png().toBuffer())
  await writePng(join(previewDir, 'plain-64.png'), await sharp(master).resize(64, 64).png().toBuffer())
  await writePng(join(previewDir, 'plain-96.png'), await sharp(master).resize(96, 96).png().toBuffer())
  await writePng(join(previewDir, 'plain-192.png'), await sharp(master).resize(192, 192).png().toBuffer())

  console.log('done v8 fontPx=' + fontPx)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
