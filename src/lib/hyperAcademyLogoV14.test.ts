/**
 * v14 assets must stay on disk and must not be overwritten by v15.
 * 실행: npx tsx src/lib/hyperAcademyLogoV14.test.ts
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const V14_512 = 'public/teacher/hyper-teacher-icon-v14-512.png'
const V14_192 = 'public/teacher/hyper-teacher-icon-v14-192.png'
const APPLE = 'public/teacher/hyper-teacher-apple-touch-v12-180.png'

for (const file of [
  V14_512,
  V14_192,
  'public/teacher/hyper-teacher-icon-maskable-v14-512.png',
  'public/teacher/hyper-teacher-icon-maskable-v14-192.png',
  'public/care/hyper-parent-icon-v14-512.png',
  'public/hub/hyper-hub-icon-v14-512.png',
  APPLE,
  'public/teacher/hyper-teacher-icon-v13-512.png',
]) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

assert.equal(
  createHash('sha256').update(readFileSync(V14_512)).digest('hex'),
  '7ac4bd77ccf2584c9222bf9224a8a26c25f4a731cc274517db83371aebb7a8ac',
)
assert.equal(
  createHash('sha256').update(readFileSync(V14_192)).digest('hex'),
  '644a72b95c7225c6ddae30a0a17616a3337bd9b97ca05d6ba35378d1e975bb58',
)
assert.equal(
  createHash('sha256').update(readFileSync(APPLE)).digest('hex'),
  'c34d38ebf8c4d9308bce61dc366fd3a1acaca01c4741ee27e277fc7c957e6e31',
)
assert.equal(
  readFileSync(V14_512).equals(readFileSync('public/teacher/hyper-teacher-icon-maskable-v14-512.png')),
  true,
)

console.log('hyperAcademyLogoV14.test.ts passed')
