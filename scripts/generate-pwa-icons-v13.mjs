/**
 * HYPER PWA Android icons v13
 *
 * Restore the v8 rule: any === maskable, both opaque.
 * Master is the already-approved v12 maskable 98% (no redesign, no 80% shrink).
 * Does not overwrite v12 files or iOS apple-touch 97%.
 *
 * Run: node scripts/generate-pwa-icons-v13.mjs
 */
import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASTER_512 = join(root, 'public', 'teacher', 'hyper-teacher-icon-maskable-v12-512.png')
const MASTER_192 = join(root, 'public', 'teacher', 'hyper-teacher-icon-maskable-v12-192.png')

const TARGETS_512 = [
  'public/teacher/hyper-teacher-icon-v13-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v13-512.png',
  'public/care/hyper-parent-icon-v13-512.png',
  'public/care/hyper-parent-icon-maskable-v13-512.png',
  'public/hub/hyper-hub-icon-v13-512.png',
  'public/hub/hyper-hub-icon-maskable-v13-512.png',
]
const TARGETS_192 = [
  'public/teacher/hyper-teacher-icon-v13-192.png',
  'public/teacher/hyper-teacher-icon-maskable-v13-192.png',
  'public/care/hyper-parent-icon-v13-192.png',
  'public/care/hyper-parent-icon-maskable-v13-192.png',
  'public/hub/hyper-hub-icon-v13-192.png',
  'public/hub/hyper-hub-icon-maskable-v13-192.png',
]

async function assertOpaquePng(path, size) {
  const buf = readFileSync(path)
  const meta = await sharp(buf).metadata()
  if (meta.format !== 'png' || meta.width !== size || meta.height !== size) {
    throw new Error(`unexpected master ${path}: ${meta.format} ${meta.width}x${meta.height}`)
  }
  if (meta.hasAlpha || meta.channels !== 3) {
    throw new Error(`master must be opaque RGB: ${path}`)
  }
}

async function main() {
  await assertOpaquePng(MASTER_512, 512)
  await assertOpaquePng(MASTER_192, 192)
  for (const rel of TARGETS_512) copyFileSync(MASTER_512, join(root, rel))
  for (const rel of TARGETS_192) copyFileSync(MASTER_192, join(root, rel))
  const a = readFileSync(join(root, TARGETS_512[0]))
  const b = readFileSync(join(root, TARGETS_512[1]))
  if (Buffer.compare(a, b) !== 0) throw new Error('v13 any/maskable 512 mismatch')
  console.log('wrote v13 any===maskable from approved v12 maskable 98%')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
