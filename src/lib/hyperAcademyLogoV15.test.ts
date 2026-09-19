/**
 * v15 assets must stay on disk and must not be overwritten by v16.
 * 실행: npx tsx src/lib/hyperAcademyLogoV15.test.ts
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const V15_512 = 'public/teacher/hyper-teacher-icon-v15-512.png'
const V15_192 = 'public/teacher/hyper-teacher-icon-v15-192.png'
const APPLE = 'public/teacher/hyper-teacher-apple-touch-v12-180.png'

for (const file of [
  V15_512,
  V15_192,
  'public/teacher/hyper-teacher-icon-maskable-v15-512.png',
  'public/care/hyper-parent-icon-v15-512.png',
  'public/hub/hyper-hub-icon-v15-512.png',
  APPLE,
]) {
  assert.equal(existsSync(file), true, `missing ${file}`)
}

assert.equal(
  createHash('sha256').update(readFileSync(V15_512)).digest('hex'),
  '9511201b77fc3563e7ea1a913d9a09b223a7f460c55d4122ff59cff7c7c14419',
)
assert.equal(
  createHash('sha256').update(readFileSync(V15_192)).digest('hex'),
  '34e9ad026cdfe523b24d352b96ec1106e9b09217910ee5997987dda6e5976cd8',
)
assert.equal(
  createHash('sha256').update(readFileSync(APPLE)).digest('hex'),
  'c34d38ebf8c4d9308bce61dc366fd3a1acaca01c4741ee27e277fc7c957e6e31',
)
assert.equal(
  readFileSync(V15_512).equals(readFileSync('public/teacher/hyper-teacher-icon-maskable-v15-512.png')),
  true,
)

console.log('hyperAcademyLogoV15.test.ts passed')
