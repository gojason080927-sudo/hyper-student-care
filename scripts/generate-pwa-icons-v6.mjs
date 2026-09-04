/**
 * PWA icons v6 — official Hyper brand cover only.
 * Source: public/hyper-brand-cover-v1.png
 * Does not redraw H / 하이퍼 / 영수 입시 전문.
 *
 * Full plate (original composition + padding) is placed in the square.
 * Tight glyph-zoom is not used, so home-screen proportions match the approved cover.
 *
 * Run: node scripts/generate-pwa-icons-v6.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SOURCE = join(root, 'public', 'hyper-brand-cover-v1.png')
const NAVY = { r: 11, g: 31, b: 74, alpha: 255 }

const teacherDir = join(root, 'public', 'teacher')
const careDir = join(root, 'public', 'care')
mkdirSync(teacherDir, { recursive: true })
mkdirSync(careDir, { recursive: true })

function isNearWhite(r, g, b) {
  return r > 230 && g > 230 && b > 230
}

async function prepareOriginalPlate() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (!isNearWhite(data[i], data[i + 1], data[i + 2])) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    throw new Error('Could not find logo plate in source image')
  }

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  console.log('plate crop', { minX, minY, cropW, cropH })

  const cropped = Buffer.alloc(cropW * cropH * 4)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((minY + y) * width + (minX + x)) * channels
      const di = (y * cropW + x) * 4
      const r = data[si]
      const g = data[si + 1]
      const b = data[si + 2]
      const a = channels === 4 ? data[si + 3] : 255
      if (a < 20 || isNearWhite(r, g, b)) {
        cropped[di] = NAVY.r
        cropped[di + 1] = NAVY.g
        cropped[di + 2] = NAVY.b
        cropped[di + 3] = 255
      } else {
        cropped[di] = r
        cropped[di + 1] = g
        cropped[di + 2] = b
        cropped[di + 3] = 255
      }
    }
  }

  const side = Math.max(cropW, cropH)
  const squared = Buffer.alloc(side * side * 4)
  for (let i = 0; i < side * side; i++) {
    squared[i * 4] = NAVY.r
    squared[i * 4 + 1] = NAVY.g
    squared[i * 4 + 2] = NAVY.b
    squared[i * 4 + 3] = 255
  }
  const ox = Math.floor((side - cropW) / 2)
  const oy = Math.floor((side - cropH) / 2)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = (y * cropW + x) * 4
      const di = ((oy + y) * side + (ox + x)) * 4
      squared[di] = cropped[si]
      squared[di + 1] = cropped[si + 1]
      squared[di + 2] = cropped[si + 2]
      squared[di + 3] = 255
    }
  }

  return sharp(squared, { raw: { width: side, height: side, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function renderIcon(platePng, size, boxFrac) {
  const box = Math.max(1, Math.round(size * boxFrac))
  const resized = await sharp(platePng)
    .resize(box, box, { fit: 'contain', background: NAVY, kernel: 'lanczos3' })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: NAVY,
    },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function write(path, buf) {
  writeFileSync(path, buf)
  const meta = await sharp(buf).metadata()
  console.log('wrote', path.replace(root, '').replaceAll('\\', '/'), meta.width + 'x' + meta.height, buf.length)
}

async function main() {
  const plate = await prepareOriginalPlate()
  const any512 = await renderIcon(plate, 512, 1)
  const any192 = await renderIcon(plate, 192, 1)
  const mask512 = await renderIcon(plate, 512, 0.82)
  const mask192 = await renderIcon(plate, 192, 0.82)

  await write(join(root, 'public', 'hyper-academy-icon-master-v6.png'), plate)
  const teacher = {
    'hyper-teacher-icon-v6-192.png': any192,
    'hyper-teacher-icon-v6-512.png': any512,
    'hyper-teacher-icon-maskable-v6-192.png': mask192,
    'hyper-teacher-icon-maskable-v6-512.png': mask512,
  }
  const parent = {
    'hyper-parent-icon-v6-192.png': any192,
    'hyper-parent-icon-v6-512.png': any512,
    'hyper-parent-icon-maskable-v6-192.png': mask192,
    'hyper-parent-icon-maskable-v6-512.png': mask512,
  }
  for (const [name, buf] of Object.entries(teacher)) await write(join(teacherDir, name), buf)
  for (const [name, buf] of Object.entries(parent)) await write(join(careDir, name), buf)

  for (const [label, src, size] of [
    ['any-192', any192, 192],
    ['any-96', any512, 96],
    ['any-64', any512, 64],
    ['any-48', any512, 48],
    ['mask-192', mask192, 192],
    ['mask-64', mask512, 64],
    ['mask-48', mask512, 48],
  ]) {
    const preview = await sharp(src).resize(size, size).png().toBuffer()
    await write(join(root, 'public', `_preview-v6-${label}.png`), preview)
  }
  console.log('done v6')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
