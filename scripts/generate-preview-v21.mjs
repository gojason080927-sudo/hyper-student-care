/**
 * v21 Galaxy WebAPK ring previews.
 * Run: node scripts/generate-preview-v21.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { MASKABLE_ICON_PADDING_RATIO, VIEW_PORT_SCALE } from './chrome-webapk-icon-spec.mjs'
import {
  CANDIDATES,
  FINAL_CLEARANCE,
  FINAL_STROKE,
  ONE_UI_SUPERELLIPSE_N,
  superellipsePath,
} from './generate-pwa-icons-v21.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', '_preview-v21')
mkdirSync(outDir, { recursive: true })

const V20 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v20-512.png')
const V21 = join(root, 'public', 'teacher', 'hyper-teacher-icon-v21-512.png')
const WALLPAPER_CANDIDATES = [
  '/home/ubuntu/.cursor/projects/workspace/assets/f8223c82-b0f1-434f-b6a4-3d74e297a09c.jpg',
  join(root, 'public', '_preview-v21', 'wallpaper-source.jpg'),
]

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

async function wallpaperBg() {
  for (const path of WALLPAPER_CANDIDATES) {
    try {
      readFileSync(path)
      return path
    } catch {
      /* try next */
    }
  }
  return { r: 168, g: 198, b: 226 }
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

async function oneUiMask(size, n = ONE_UI_SUPERELLIPSE_N) {
  const cx = size / 2
  const cy = size / 2
  const a = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <path d="${superellipsePath(cx, cy, a, a, n)}" fill="#fff"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function applyMask(src, mask) {
  return sharp(src).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function galaxyTile(srcPath, size, n = ONE_UI_SUPERELLIPSE_N) {
  const vp = await viewportOf(srcPath)
  return applyMask(await sharp(vp).resize(size, size).png().toBuffer(), await oneUiMask(size, n))
}

async function onBg(tile, size, bg) {
  const pad = Math.round(size * 0.35)
  const canvas = typeof bg === 'string'
    ? await sharp(bg).resize(size + pad * 2, size + pad * 2, { fit: 'cover' }).png().toBuffer()
    : await sharp({
        create: { width: size + pad * 2, height: size + pad * 2, channels: 3, background: bg },
      })
        .png()
        .toBuffer()
  return sharp(canvas)
    .composite([{ input: tile, left: pad, top: pad }])
    .png()
    .toBuffer()
}

async function labeled(src, title, width) {
  const meta = await sharp(src).metadata()
  const w = width || meta.width
  const img = await sharp(src).resize(w, Math.round((w * meta.height) / meta.width)).png().toBuffer()
  const outMeta = await sharp(img).metadata()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outMeta.width}" height="36"><text x="50%" y="26" text-anchor="middle" fill="#d7dde8" font-size="14" font-family="sans-serif">${title}</text></svg>`
  return sharp({
    create: {
      width: outMeta.width + 24,
      height: outMeta.height + 60,
      channels: 3,
      background: { r: 12, g: 14, b: 20 },
    },
  })
    .composite([
      { input: img, left: 12, top: 12 },
      { input: Buffer.from(svg), left: 12, top: 12 + outMeta.height },
    ])
    .png()
    .toBuffer()
}

async function row(cells) {
  const metas = []
  for (const cell of cells) metas.push(await sharp(cell).metadata())
  let left = 16
  const composites = []
  for (let i = 0; i < cells.length; i++) {
    composites.push({ input: cells[i], left, top: 16 })
    left += metas[i].width + 16
  }
  return sharp({
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
}

async function main() {
  const wallpaper = await wallpaperBg()
  const files = {
    v20: V20,
    v21: V21,
    '10-c6': join(outDir, 'ring-10-c6-512.png'),
    '12-c6': join(outDir, 'ring-12-c6-512.png'),
    '10-c2': join(outDir, 'ring-10-c2-512.png'),
    '12-c2': join(outDir, 'ring-12-c2-512.png'),
  }

  const light = { r: 236, g: 242, b: 248 }
  const sky = { r: 168, g: 198, b: 226 }

  const galaxy280 = {}
  const home48 = {}
  const home144 = {}
  const clip24 = {}
  for (const [key, path] of Object.entries(files)) {
    galaxy280[key] = await galaxyTile(path, 280)
    home48[key] = await galaxyTile(path, 48)
    home144[key] = await galaxyTile(path, 144)
    clip24[key] = await galaxyTile(path, 280, 2.4)
    writeFileSync(join(outDir, `${key}-galaxy-280.png`), galaxy280[key])
    writeFileSync(join(outDir, `${key}-home-48.png`), await onBg(home48[key], 48, light))
    writeFileSync(join(outDir, `${key}-home-144-light.png`), await onBg(home144[key], 144, light))
    writeFileSync(join(outDir, `${key}-home-144-sky.png`), await onBg(home144[key], 144, sky))
    writeFileSync(join(outDir, `${key}-n24-280.png`), clip24[key])
  }

  const artifacts = '/opt/cursor/artifacts'
  mkdirSync(artifacts, { recursive: true })

  const compare280 = await row([
    await labeled(galaxy280.v20, 'v20 no ring'),
    await labeled(galaxy280['10-c6'], '10px / 6px in'),
    await labeled(galaxy280['12-c6'], '12px / 6px in'),
    await labeled(galaxy280['12-c2'], `final ${FINAL_STROKE}px / ${FINAL_CLEARANCE}px in`),
  ])
  writeFileSync(join(outDir, 'compare-galaxy-280.png'), compare280)

  if (typeof wallpaper === 'string') {
    const comparePhoto = await row([
      await labeled(await onBg(home144.v20, 144, wallpaper), 'v20 photo'),
      await labeled(await onBg(home144['10-c6'], 144, wallpaper), '10px 6in photo'),
      await labeled(await onBg(home144['12-c6'], 144, wallpaper), '12px 6in photo'),
      await labeled(await onBg(home144['12-c2'], 144, wallpaper), 'final photo'),
    ])
    writeFileSync(join(artifacts, 'v21_compare_photo_144.png'), comparePhoto)
    writeFileSync(
      join(artifacts, 'v21_compare_home_48_photo.png'),
      await row([
        await labeled(await onBg(home48.v20, 48, wallpaper), 'v20 48dp', 120),
        await labeled(await onBg(home48['10-c6'], 48, wallpaper), '10/6 48dp', 120),
        await labeled(await onBg(home48['12-c6'], 48, wallpaper), '12/6 48dp', 120),
        await labeled(await onBg(home48['12-c2'], 48, wallpaper), 'final 48dp', 120),
      ]),
    )
  }

  const compareLight = await row([
    await labeled(await onBg(home144.v20, 144, light), 'v20 light'),
    await labeled(await onBg(home144['10-c2'], 144, light), '10px 2in light'),
    await labeled(await onBg(home144['12-c6'], 144, light), '12px 6in light'),
    await labeled(await onBg(home144['12-c2'], 144, light), 'final light'),
  ])
  writeFileSync(join(outDir, 'compare-light-144.png'), compareLight)

  const compare48 = await row([
    await labeled(await onBg(home48.v20, 48, sky), 'v20 48dp', 120),
    await labeled(await onBg(home48['10-c6'], 48, sky), '10/6 48dp', 120),
    await labeled(await onBg(home48['12-c6'], 48, sky), '12/6 48dp', 120),
    await labeled(await onBg(home48['12-c2'], 48, sky), 'final 48dp', 120),
  ])
  writeFileSync(join(outDir, 'compare-home-48.png'), compare48)

  const compareSky = await row([
    await labeled(await onBg(home144.v20, 144, sky), 'v20 sky'),
    await labeled(await onBg(home144['10-c6'], 144, sky), '10px 6in sky'),
    await labeled(await onBg(home144['12-c6'], 144, sky), '12px 6in sky'),
    await labeled(await onBg(home144['12-c2'], 144, sky), 'final sky'),
  ])
  writeFileSync(join(outDir, 'compare-sky-144.png'), compareSky)

  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><title>v21 inner ring</title>
<style>body{margin:24px;background:#0c0e14;color:#d7dde8;font-family:sans-serif}img{background:#12141a;max-width:100%}</style></head>
<body>
<h1>v21 — v20 mark + n=2.6 black ring</h1>
<p>Official candidate: stroke ${FINAL_STROKE}px, clearance ${FINAL_CLEARANCE}px on the Chrome 446 / One UI n=2.6 mask. Manifest still points at v20.</p>
<p><img src="compare-galaxy-280.png" alt="galaxy compare"/></p>
<p><img src="compare-light-144.png" alt="light compare"/></p>
<p><img src="compare-sky-144.png" alt="sky compare"/></p>
<p><img src="compare-home-48.png" alt="48dp compare"/></p>
</body></html>`,
  )

  writeFileSync(join(artifacts, 'v21_compare_galaxy_280.png'), compare280)
  writeFileSync(join(artifacts, 'v21_compare_light_144.png'), compareLight)
  writeFileSync(join(artifacts, 'v21_compare_sky_144.png'), compareSky)
  writeFileSync(join(artifacts, 'v21_compare_home_48.png'), compare48)

  console.log('wrote public/_preview-v21', { candidates: CANDIDATES.length, final: `${FINAL_STROKE}/${FINAL_CLEARANCE}` })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
