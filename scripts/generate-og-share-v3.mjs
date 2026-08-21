import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const pngCandidates = [
  resolve('public/hyper-student-care-share-v3.png'),
  resolve('.cursor/projects/c-Users-Desktop-hyperstudentcare/assets/hyper-student-care-share-v3.png'),
  resolve('../.cursor/projects/c-Users-Desktop-hyperstudentcare/assets/hyper-student-care-share-v3.png'),
]

const pngPath = pngCandidates.find((p) => existsSync(p))
if (!pngPath) {
  console.error('Source PNG not found. Generate public/hyper-student-care-share-v3.png first.')
  process.exit(1)
}

const outPath = resolve('public/hyper-student-care-share-v3.jpg')

await sharp(readFileSync(pngPath))
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(outPath)

console.log('Created', outPath)
