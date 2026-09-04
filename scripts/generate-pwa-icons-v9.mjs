/**
 * HYPER ACADEMY PWA icon v9 — navy + silver H / HYPER / ACADEMY lockup.
 * Inherits v8 canvas, navy, circular safe-zone, and same-master any/maskable export.
 * Does not overwrite v8 files.
 * Run: node scripts/generate-pwa-icons-v9.mjs
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
const previewDir = join(root, 'public', '_preview-v9')
mkdirSync(teacherDir, { recursive: true })
mkdirSync(careDir, { recursive: true })
mkdirSync(previewDir, { recursive: true })

const CANVAS = 1024
const SAFE_RADIUS = 409
const MIN_CIRCLE_MARGIN = 20

function iconHtml(s) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Source+Serif+4:opsz,wght@8..60,700&display=swap" rel="stylesheet"/>
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
  .lockup {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transform: translate(${s.ox}px, ${s.oy}px);
  }
  .silver {
    background-image: linear-gradient(180deg, #E4E6EA 0%, #C8CCD1 55%, #A8AEB5 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.28));
  }
  .h {
    font-family: "Source Serif 4", "Times New Roman", serif;
    font-optical-sizing: auto;
    font-weight: 700;
    font-size: ${s.h}px;
    line-height: 0.80;
    letter-spacing: -0.02em;
    margin: 0;
    padding: 0;
  }
  .hyper {
    font-family: Oswald, "Arial Narrow", sans-serif;
    font-weight: 700;
    font-size: ${s.hyper}px;
    line-height: 0.86;
    letter-spacing: 0.02em;
    margin: ${s.gap1}px 0 0;
    padding: 0;
  }
  .academy {
    font-family: Oswald, "Arial Narrow", sans-serif;
    font-weight: 700;
    font-size: ${s.academy}px;
    line-height: 0.88;
    letter-spacing: 0.012em;
    margin: ${s.gap2}px 0 0;
    padding: 0;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="lockup">
      <div class="silver h">H</div>
      <div class="silver hyper">HYPER</div>
      <div class="silver academy">ACADEMY</div>
    </div>
  </div>
</body>
</html>`
}

function isLogoPixel(r, g, b, a) {
  if (a < 20) return false
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma >= 88 && Math.hypot(r - 7, g - 24, b - 46) > 36
}

function bands(data, width, height, channels) {
  const row = []
  for (let y = 0; y < height; y++) {
    let n = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) n++
    }
    row.push(n)
  }
  const thresh = Math.max(2, Math.round(width * 0.025))
  const out = []
  let s = null
  for (let y = 0; y <= height; y++) {
    const on = y < height && row[y] >= thresh
    if (on && s === null) s = y
    if (!on && s !== null) {
      let minX = width
      let maxX = 0
      for (let yy = s; yy < y; yy++) {
        for (let x = 0; x < width; x++) {
          const i = (yy * width + x) * channels
          if (!isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue
          if (x < minX) minX = x
          if (x > maxX) maxX = x
        }
      }
      out.push({
        start: s,
        end: y - 1,
        h: y - s,
        w: maxX - minX + 1,
        pctH: +((100 * (y - s)) / height).toFixed(1),
        pctW: +((100 * (maxX - minX + 1)) / width).toFixed(1),
      })
      s = null
    }
  }
  return out
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
  const found = bands(data, width, height, channels)
  return {
    count,
    bbox: { minX, minY, maxX, maxY, w: bw, h: bh },
    pctW: +((100 * bw) / width).toFixed(1),
    pctH: +((100 * bh) / height).toFixed(1),
    centerOffX: +((minX + maxX) / 2 - cx).toFixed(1),
    centerOffY: +((minY + maxY) / 2 - cy).toFixed(1),
    maxDist: +maxDist.toFixed(1),
    safeRadius: +radius.toFixed(1),
    circleMargin: +(radius - maxDist).toFixed(1),
    outsideCircle,
    insideCircle: outsideCircle === 0,
    bands: found,
  }
}

async function inspectBuffer(buf, label) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const result = { label, ...analyze(data, info.width, info.height, info.channels) }
  console.log(JSON.stringify(result))
  return result
}

async function renderIcon(page, spec) {
  await page.setViewportSize({ width: CANVAS, height: CANVAS })
  await page.setContent(iconHtml(spec), { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForTimeout(240)
  return Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: CANVAS, height: CANVAS } }))
}

function passes(stats) {
  const hBand = stats.bands[0]
  return (
    stats.insideCircle &&
    stats.circleMargin >= MIN_CIRCLE_MARGIN &&
    stats.pctW <= 58 &&
    stats.pctH <= 68 &&
    stats.pctW >= 48 &&
    stats.pctH >= 56 &&
    stats.bands.length >= 3 &&
    hBand &&
    hBand.pctH >= 33 &&
    hBand.pctH <= 38 &&
    Math.abs(stats.centerOffX) <= 8 &&
    Math.abs(stats.centerOffY) <= 10
  )
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

function scaleSpec(spec, k) {
  return {
    h: Math.round(spec.h * k),
    hyper: Math.round(spec.hyper * k),
    academy: Math.round(spec.academy * k),
    gap1: Math.max(4, Math.round(spec.gap1 * k)),
    gap2: Math.max(3, Math.round(spec.gap2 * k)),
    ox: spec.ox,
    oy: spec.oy,
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  let spec = { h: 534, hyper: 159, academy: 117, gap1: 8, gap2: 6, ox: 0, oy: -24 }
  let master = await renderIcon(page, spec)
  let stats = await inspectBuffer(master, 'try-0')

  for (let step = 0; step < 6; step++) {
    if (stats.insideCircle && stats.circleMargin >= MIN_CIRCLE_MARGIN && stats.pctW <= 56 && stats.pctH <= 66 && stats.bands.length >= 3) {
      break
    }
    if (!stats.insideCircle || stats.circleMargin < 22 || stats.pctW > 56) {
      spec.hyper = Math.round(spec.hyper * 0.97)
      spec.academy = Math.round(spec.academy * 0.96)
    }
    if (Math.abs(stats.centerOffX) > 2) spec.ox = Math.round(spec.ox - stats.centerOffX)
    if (Math.abs(stats.centerOffY) > 2) spec.oy = Math.round(spec.oy - stats.centerOffY)
    master = await renderIcon(page, spec)
    stats = await inspectBuffer(master, `try-${step + 1}`)
  }

  if (stats.centerOffX !== 0 || stats.centerOffY !== 0) {
    spec.ox = Math.round(spec.ox - stats.centerOffX)
    spec.oy = Math.round(spec.oy - stats.centerOffY)
    master = await renderIcon(page, spec)
    stats = await inspectBuffer(master, 'recenter')
  }

  await browser.close()

  if (!stats.insideCircle || stats.circleMargin < MIN_CIRCLE_MARGIN) {
    throw new Error(
      `lockup fails circular safe zone: outside=${stats.outsideCircle} margin=${stats.circleMargin} w=${stats.pctW} h=${stats.pctH}`,
    )
  }
  if (stats.pctW > 58 || stats.pctH > 68) {
    throw new Error(`lockup too large: w=${stats.pctW} h=${stats.pctH}`)
  }

  const any512 = await sharp(master).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()
  const any192 = await sharp(master).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()
  const mask512 = any512
  const mask192 = any192

  await inspectBuffer(master, 'v9-master-1024')
  await inspectBuffer(any512, 'v9-any-512')
  await inspectBuffer(mask512, 'v9-mask-512-same-as-any')
  await inspectBuffer(await sharp(any512).resize(48, 48).png().toBuffer(), 'v9-any-48')

  const v8 = await sharp(join(root, 'public', 'hyper-academy-icon-master-v8.png')).png().toBuffer()
  await inspectBuffer(v8, 'v8-master-compare')

  await writePng(join(root, 'public', 'hyper-academy-icon-master-v9.png'), master)
  const teacher = {
    'hyper-teacher-icon-v9-192.png': any192,
    'hyper-teacher-icon-v9-512.png': any512,
    'hyper-teacher-icon-maskable-v9-192.png': mask192,
    'hyper-teacher-icon-maskable-v9-512.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-v9-192.png': any192,
    'hyper-parent-icon-v9-512.png': any512,
    'hyper-parent-icon-maskable-v9-192.png': mask192,
    'hyper-parent-icon-maskable-v9-512.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await writePng(join(teacherDir, name), buf)
  for (const [name, buf] of Object.entries(parent)) await writePng(join(careDir, name), buf)

  for (const kind of ['circle', 'rounded', 'squircle', 'samsung']) {
    for (const size of [192, 96, 64, 48]) {
      await writePng(join(previewDir, `${kind}-${size}.png`), await maskedPreview(master, size, kind))
    }
  }
  await writePng(join(previewDir, 'plain-48.png'), await sharp(master).resize(48, 48).png().toBuffer())
  await writePng(join(previewDir, 'plain-64.png'), await sharp(master).resize(64, 64).png().toBuffer())
  await writePng(join(previewDir, 'plain-96.png'), await sharp(master).resize(96, 96).png().toBuffer())
  await writePng(join(previewDir, 'plain-192.png'), await sharp(master).resize(192, 192).png().toBuffer())

  const v8p = await sharp(v8).resize(48, 48).png().toBuffer()
  const v9p = await sharp(master).resize(48, 48).png().toBuffer()
  const gap = 8
  const compare = await sharp({
    create: { width: 48 * 2 + gap + 16, height: 48 + 16, channels: 4, background: { r: 228, g: 230, b: 234, alpha: 1 } },
  })
    .composite([
      { input: v8p, left: 8, top: 8 },
      { input: v9p, left: 8 + 48 + gap, top: 8 },
    ])
    .png()
    .toBuffer()
  await writePng(join(previewDir, 'compare-v8-v9-48.png'), compare)

  const v8s = await maskedPreview(v8, 48, 'samsung')
  const v9s = await maskedPreview(master, 48, 'samsung')
  const sMeta = await sharp(v8s).metadata()
  const sw = sMeta.width
  const sh = sMeta.height
  const samsungCompare = await sharp({
    create: { width: sw * 2 + gap + 16, height: sh + 16, channels: 4, background: { r: 228, g: 230, b: 234, alpha: 1 } },
  })
    .composite([
      { input: v8s, left: 8, top: 8 },
      { input: v9s, left: 8 + sw + gap, top: 8 },
    ])
    .png()
    .toBuffer()
  await writePng(join(previewDir, 'compare-samsung-v8-v9-48.png'), samsungCompare)

  console.log('done v9 spec=' + JSON.stringify(spec))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
