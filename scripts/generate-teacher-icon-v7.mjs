/**
 * HYPER TEACHER PWA icons from the FULL original logo plate.
 * No glyph redraw / no tight crop that clips H+하이퍼.
 * Run: node scripts/generate-teacher-icon-v7.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SOURCE = join(root, 'public', 'hyper-brand-cover-v1.png')
const outDir = join(root, 'public', 'teacher')
const NAVY = { r: 11, g: 31, b: 74, alpha: 255 }
const PREFIX = 'hyper-teacher-icon-v7'

function isNearWhite(r, g, b) {
  return r > 230 && g > 230 && b > 230
}

/** Full logo plate: strip white margin, paint AA corner whites to navy. */
async function prepareOriginalPlate() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

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

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  console.log('plate', { minX, minY, cropW, cropH })

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

  return sharp(cropped, {
    raw: { width: cropW, height: cropH, channels: 4 },
  })
    .png()
    .toBuffer()
}

/** Full plate centered on navy (uniform scale, no stretch). */
async function renderAny(platePng, size) {
  return sharp(platePng)
    .resize(size, size, {
      fit: 'contain',
      background: NAVY,
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/**
 * Maskable: full original plate scaled into ~82% safe zone (centered).
 * Keeps whole logo visible under Android round/squircle masks.
 */
async function renderMaskable(platePng, size, logoScale = 0.82) {
  const side = Math.round(size * logoScale)
  const logo = await sharp(platePng)
    .resize(side, side, {
      fit: 'contain',
      background: NAVY,
      withoutEnlargement: false,
    })
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
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function write(name, buf) {
  const out = join(outDir, name)
  writeFileSync(out, buf)
  console.log('wrote', name, buf.length)
}

async function main() {
  const plate = await prepareOriginalPlate()
  await write(`${PREFIX}-192.png`, await renderAny(plate, 192))
  await write(`${PREFIX}-512.png`, await renderAny(plate, 512))
  await write(`${PREFIX}-maskable.png`, await renderMaskable(plate, 512, 0.82))
  await write(`${PREFIX}-apple-touch.png`, await renderAny(plate, 180))
  console.log('done', PREFIX)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
