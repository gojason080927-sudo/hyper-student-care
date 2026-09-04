/**
 * HYPER ACADEMY PWA icon v7 — final vertical lockup.
 * Navy + silver serif H + larger HYPER / ACADEMY. Not the horizontal brand cover.
 * Run: node scripts/generate-pwa-icons-v7.mjs
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
mkdirSync(teacherDir, { recursive: true })
mkdirSync(careDir, { recursive: true })

function iconHtml(mode) {
  const maskable = mode === 'maskable'
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Source+Serif+4:opsz,wght@8..60,700&display=swap" rel="stylesheet"/>
<style>
  html, body { margin: 0; padding: 0; width: 1024px; height: 1024px; overflow: hidden; background: #07182E; }
  .stage {
    width: 1024px;
    height: 1024px;
    position: relative;
    background:
      radial-gradient(ellipse 70% 58% at 50% 38%, #0C274C 0%, #091F3E 50%, #07182E 82%, #061427 100%);
  }
  .content {
    position: absolute;
    inset: ${maskable ? '122px 108px' : '158px 96px 168px'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
  }
  .silver {
    background-image: linear-gradient(172deg, #E7E9EC 0%, #C9CDD2 42%, #9EA4AB 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.5)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.22));
  }
  .h {
    font-family: "Source Serif 4", "Times New Roman", serif;
    font-optical-sizing: auto;
    font-weight: 700;
    font-size: ${maskable ? '422px' : '452px'};
    line-height: 0.80;
    letter-spacing: -0.03em;
    margin: 0;
    padding: 0;
  }
  .hyper {
    font-family: Oswald, "Arial Narrow", sans-serif;
    font-size: ${maskable ? '258px' : '286px'};
    line-height: 0.86;
    letter-spacing: 0.028em;
    margin: 6px 0 0;
    padding: 0;
    font-weight: 700;
  }
  .academy {
    font-family: Oswald, "Arial Narrow", sans-serif;
    font-size: ${maskable ? '190px' : '208px'};
    line-height: 0.90;
    letter-spacing: 0.022em;
    font-weight: 700;
    margin: 6px 0 0;
    padding: 0;
    background-image: linear-gradient(180deg, #E7E9EC 0%, #C9CDD2 48%, #9EA4AB 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.48));
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="content">
      <div class="silver h">H</div>
      <div class="silver hyper">HYPER</div>
      <div class="academy">ACADEMY</div>
    </div>
  </div>
</body>
</html>`
}

async function renderIcon(page, mode) {
  await page.setViewportSize({ width: 1024, height: 1024 })
  await page.setContent(iconHtml(mode), { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForTimeout(250)
  return Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1024, height: 1024 } }))
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
  const thresh = Math.max(2, Math.round(width * 0.03))
  const out = []
  let s = null
  for (let y = 0; y <= height; y++) {
    const on = y < height && row[y] >= thresh
    if (on && s === null) s = y
    if (!on && s !== null) {
      out.push({ start: s, end: y - 1, h: y - s, pct: +((100 * (y - s)) / height).toFixed(1) })
      s = null
    }
  }
  return out
}

async function occupancy(buf, label) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  const inset = Math.round(width * 0.1)
  const result = {
    label,
    lockupH: +((100 * (maxY - minY + 1)) / height).toFixed(1),
    lockupW: +((100 * (maxX - minX + 1)) / width).toFixed(1),
    inset: {
      top: +((100 * minY) / height).toFixed(1),
      bottom: +((100 * (height - 1 - maxY)) / height).toFixed(1),
      left: +((100 * minX) / width).toFixed(1),
      right: +((100 * (width - 1 - maxX)) / width).toFixed(1),
    },
    inside80Square: minX >= inset && minY >= inset && maxX < width - inset && maxY < height - inset,
    bands: bands(data, width, height, channels),
  }
  console.log(JSON.stringify(result))
  return result
}

async function writePng(path, buf) {
  writeFileSync(path, buf)
  console.log('wrote', path.replace(root, '').replaceAll('\\', '/'), buf.length)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const master = await renderIcon(page, 'any')
  const maskMaster = await renderIcon(page, 'maskable')
  await browser.close()

  const any512 = await sharp(master).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()
  const any192 = await sharp(master).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()
  const mask512 = await sharp(maskMaster).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()
  const mask192 = await sharp(maskMaster).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()

  await occupancy(master, 'any-1024')
  await occupancy(maskMaster, 'maskable-1024')
  await occupancy(any512, 'any-512')
  await occupancy(await sharp(any512).resize(48, 48).png().toBuffer(), 'any-48')

  await writePng(join(root, 'public', 'hyper-academy-icon-master-v7.png'), master)
  const teacher = {
    'hyper-teacher-icon-v7-192.png': any192,
    'hyper-teacher-icon-v7-512.png': any512,
    'hyper-teacher-icon-maskable-v7-192.png': mask192,
    'hyper-teacher-icon-maskable-v7-512.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-v7-192.png': any192,
    'hyper-parent-icon-v7-512.png': any512,
    'hyper-parent-icon-maskable-v7-192.png': mask192,
    'hyper-parent-icon-maskable-v7-512.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await writePng(join(teacherDir, name), buf)
  for (const [name, buf] of Object.entries(parent)) await writePng(join(careDir, name), buf)

  for (const [label, src, size] of [
    ['192', any192, 192],
    ['96', any512, 96],
    ['64', any512, 64],
    ['48', any512, 48],
    ['mask-64', mask512, 64],
    ['mask-48', mask512, 48],
  ]) {
    await writePng(
      join(root, 'public', `_preview-v7-${label}.png`),
      await sharp(src).resize(size, size).png().toBuffer(),
    )
  }
  console.log('done v7')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
