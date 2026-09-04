/**
 * HYPER ACADEMY PWA icon v4
 * H + HYPER + ACADEMY only. No swoosh, no extra marks.
 * Run: node scripts/generate-pwa-icons-v4.mjs
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

const NAVY = { r: 7, g: 24, b: 46 }

function iconHtml(mode) {
  const maskable = mode === 'maskable'
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet"/>
<style>
  html, body { margin: 0; padding: 0; width: 1024px; height: 1024px; overflow: hidden; background: #07182E; }
  .stage {
    width: 1024px;
    height: 1024px;
    position: relative;
    background:
      radial-gradient(ellipse 78% 62% at 50% 30%, #0D2B55 0%, #0A2146 46%, #07182E 78%, #061427 100%);
  }
  .content {
    position: absolute;
    inset: ${maskable ? '72px 80px 80px' : '36px 40px 48px'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: ${maskable ? '8px' : '0'};
  }
  .silver {
    font-family: "Source Serif 4", "Times New Roman", serif;
    font-optical-sizing: auto;
    font-weight: 700;
    background-image: linear-gradient(172deg, #E7E9EC 0%, #C9CDD2 42%, #9EA4AB 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.55)) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.28));
  }
  .h {
    font-size: ${maskable ? '790px' : '760px'};
    line-height: 0.74;
    letter-spacing: -0.03em;
    margin: 0;
    padding: 0;
    transform: scaleX(${maskable ? 1.26 : 1.22});
    transform-origin: center top;
  }
  .hyper {
    font-size: ${maskable ? '86px' : '98px'};
    line-height: 1;
    letter-spacing: 0.06em;
    margin-top: ${maskable ? '2px' : '0'};
    font-weight: 700;
  }
  .academy-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: ${maskable ? '16px' : '18px'};
  }
  .rule {
    width: ${maskable ? '48px' : '58px'};
    height: 2px;
    background: linear-gradient(90deg, transparent, #9EA4AB 18%, #C9CDD2 50%, #9EA4AB 82%, transparent);
    opacity: 0.68;
    flex: none;
  }
  .academy {
    font-size: ${maskable ? '40px' : '44px'};
    line-height: 1;
    letter-spacing: 0.32em;
    font-weight: 600;
    padding-left: 0.32em;
    background-image: linear-gradient(180deg, #C9CDD2 0%, #9EA4AB 70%, #8A9098 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.45));
    font-family: "Source Serif 4", "Times New Roman", serif;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="content">
      <div class="silver h">H</div>
      <div class="silver hyper">HYPER</div>
      <div class="academy-row">
        <span class="rule"></span>
        <div class="academy">ACADEMY</div>
        <span class="rule"></span>
      </div>
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
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1024, height: 1024 } })
  return Buffer.from(buf)
}

function isLogoPixel(r, g, b, a) {
  if (a < 20) return false
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const navy = Math.hypot(r - NAVY.r, g - NAVY.g, b - NAVY.b)
  return luma >= 92 && navy > 36
}

async function occupancy(buf, label) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const row = new Array(height).fill(0)
  const col = new Array(width).fill(0)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        row[y]++
        col[x]++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  const allBox = { w: maxX - minX + 1, h: maxY - minY + 1, minX, minY, maxX, maxY }
  let best = { len: 0, start: 0, end: 0 }
  let runStart = null
  for (let y = 0; y <= height; y++) {
    const on = y < height && row[y] >= Math.max(8, Math.round(width * 0.04))
    if (on && runStart === null) runStart = y
    if (!on && runStart !== null) {
      const len = y - runStart
      if (len > best.len) best = { len, start: runStart, end: y - 1 }
      runStart = null
    }
  }
  let hx0 = width
  let hx1 = 0
  for (let y = best.start; y <= best.end; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < hx0) hx0 = x
        if (x > hx1) hx1 = x
      }
    }
  }
  const hW = hx1 - hx0 + 1
  const hH = best.end - best.start + 1
  const inset = Math.round(width * 0.1)
  const radius = width * 0.4
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const corners = [
    [allBox.minX, allBox.minY],
    [allBox.maxX, allBox.minY],
    [allBox.minX, allBox.maxY],
    [allBox.maxX, allBox.maxY],
  ]
  const maxCorner = Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)))
  const result = {
    label,
    size: `${width}x${height}`,
    hPct: { w: +(100 * hW / width).toFixed(1), h: +(100 * hH / height).toFixed(1) },
    allPct: { w: +(100 * allBox.w / width).toFixed(1), h: +(100 * allBox.h / height).toFixed(1) },
    allInset: {
      top: +(100 * allBox.minY / height).toFixed(1),
      bottom: +(100 * (height - 1 - allBox.maxY) / height).toFixed(1),
      left: +(100 * allBox.minX / width).toFixed(1),
      right: +(100 * (width - 1 - allBox.maxX) / width).toFixed(1),
    },
    inside80Circle: maxCorner <= radius + 1,
    inside80Square:
      allBox.minX >= inset &&
      allBox.minY >= inset &&
      allBox.maxX < width - inset &&
      allBox.maxY < height - inset,
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

  await occupancy(master, 'master-any-1024')
  await occupancy(maskMaster, 'master-maskable-1024')
  await occupancy(any512, 'any-512')
  await occupancy(any192, 'any-192')
  await occupancy(mask512, 'maskable-512')
  await occupancy(mask192, 'maskable-192')

  await writePng(join(root, 'public', 'hyper-academy-icon-master-v4.png'), master)
  const teacher = {
    'hyper-teacher-icon-192-v4.png': any192,
    'hyper-teacher-icon-512-v4.png': any512,
    'hyper-teacher-maskable-192-v4.png': mask192,
    'hyper-teacher-maskable-512-v4.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-192-v4.png': any192,
    'hyper-parent-icon-512-v4.png': any512,
    'hyper-parent-maskable-192-v4.png': mask192,
    'hyper-parent-maskable-512-v4.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await writePng(join(teacherDir, name), buf)
  for (const [name, buf] of Object.entries(parent)) await writePng(join(careDir, name), buf)
  console.log('done v4')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
