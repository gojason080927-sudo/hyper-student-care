/**
 * HYPER ACADEMY PWA icon v5
 * Smaller H, larger HYPER / ACADEMY. Compact vertical lockup.
 * Run: node scripts/generate-pwa-icons-v5.mjs
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
      radial-gradient(ellipse 78% 62% at 50% 30%, #0D2B55 0%, #0A2146 46%, #07182E 78%, #061427 100%);
  }
  .content {
    position: absolute;
    inset: ${maskable ? '92px 72px' : '72px 56px'};
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
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.55)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.26));
  }
  .h {
    font-family: "Source Serif 4", "Times New Roman", serif;
    font-optical-sizing: auto;
    font-weight: 700;
    font-size: ${maskable ? '500px' : '528px'};
    line-height: 0.78;
    letter-spacing: -0.03em;
    margin: 0;
    padding: 0;
  }
  .hyper {
    font-family: Oswald, "Arial Narrow", sans-serif;
    font-size: ${maskable ? '236px' : '252px'};
    line-height: 0.88;
    letter-spacing: 0.04em;
    margin: 4px 0 0;
    padding: 0;
    font-weight: 700;
  }
  .academy {
    font-family: Oswald, "Arial Narrow", sans-serif;
    font-size: ${maskable ? '184px' : '198px'};
    line-height: 0.9;
    letter-spacing: 0.06em;
    font-weight: 700;
    margin: 4px 0 0;
    padding: 0 0 0 0.04em;
    background-image: linear-gradient(180deg, #E7E9EC 0%, #C9CDD2 48%, #9EA4AB 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(3, 8, 18, 0.5));
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
  return luma >= 92 && Math.hypot(r - 7, g - 24, b - 46) > 36
}

async function occupancy(buf, label) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const row = new Array(height).fill(0)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        row[y]++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  let best = { len: 0, start: 0, end: 0 }
  let runStart = null
  const thresh = Math.max(8, Math.round(width * 0.035))
  for (let y = 0; y <= height; y++) {
    const on = y < height && row[y] >= thresh
    if (on && runStart === null) runStart = y
    if (!on && runStart !== null) {
      const len = y - runStart
      if (len > best.len) best = { len, start: runStart, end: y - 1 }
      runStart = null
    }
  }
  const hH = best.end - best.start + 1
  const allH = maxY - minY + 1
  const allW = maxX - minX + 1
  const inset = Math.round(width * 0.1)
  const result = {
    label,
    hH: +(100 * hH / height).toFixed(1),
    lockupH: +(100 * allH / height).toFixed(1),
    lockupW: +(100 * allW / width).toFixed(1),
    inset: {
      top: +(100 * minY / height).toFixed(1),
      bottom: +(100 * (height - 1 - maxY) / height).toFixed(1),
      left: +(100 * minX / width).toFixed(1),
      right: +(100 * (width - 1 - maxX) / width).toFixed(1),
    },
    inside80Square:
      minX >= inset && minY >= inset && maxX < width - inset && maxY < height - inset,
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
  const p64 = await sharp(any512).resize(64, 64).png().toBuffer()
  const p48 = await sharp(any512).resize(48, 48).png().toBuffer()
  const m64 = await sharp(mask512).resize(64, 64).png().toBuffer()
  const m48 = await sharp(mask512).resize(48, 48).png().toBuffer()

  await occupancy(master, 'any-1024')
  await occupancy(maskMaster, 'maskable-1024')
  await occupancy(any192, 'any-192')
  await occupancy(mask512, 'maskable-512')

  await writePng(join(root, 'public', 'hyper-academy-icon-master-v5.png'), master)
  const teacher = {
    'hyper-teacher-icon-192-v5.png': any192,
    'hyper-teacher-icon-512-v5.png': any512,
    'hyper-teacher-maskable-192-v5.png': mask192,
    'hyper-teacher-maskable-512-v5.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-192-v5.png': any192,
    'hyper-parent-icon-512-v5.png': any512,
    'hyper-parent-maskable-192-v5.png': mask192,
    'hyper-parent-maskable-512-v5.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await writePng(join(teacherDir, name), buf)
  for (const [name, buf] of Object.entries(parent)) await writePng(join(careDir, name), buf)
  await writePng(join(root, 'public', '_preview-v5-64.png'), p64)
  await writePng(join(root, 'public', '_preview-v5-48.png'), p48)
  await writePng(join(root, 'public', '_preview-v5-mask-64.png'), m64)
  await writePng(join(root, 'public', '_preview-v5-mask-48.png'), m48)
  console.log('done v5')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
