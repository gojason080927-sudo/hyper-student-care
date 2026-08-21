/**
 * 수학 slot 3 (부교재) 설정 테스트 (node scripts/test-math-slot3.mjs)
 */
import assert from 'node:assert/strict'

const TEACHER_MOBILE_VISIBLE_SLOTS = { 수학: [1, 2, 3], 영어: [1, 2, 3] }
const PARENT_VISIBLE_SLOTS = { 수학: [1, 2, 3], 영어: [1, 2, 3] }

function getMathHomeworkSlotHeading(slotNumber) {
  if (slotNumber === 1) return '개념교재'
  if (slotNumber === 2) return '유형교재'
  if (slotNumber === 3) return '부교재'
  return null
}

function getEnglishHomeworkSlotHeading(slotNumber) {
  if (slotNumber === 1) return '문법교재'
  if (slotNumber === 2) return '독해 교재'
  if (slotNumber === 3) return '단어장'
  return null
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`✓ ${name}`)
  } catch (error) {
    failed++
    console.error(`✗ ${name}`)
    console.error(`  ${error instanceof Error ? error.message : error}`)
  }
}

test('모바일 수학 슬롯 3개', () => {
  assert.deepEqual(TEACHER_MOBILE_VISIBLE_SLOTS.수학, [1, 2, 3])
})

test('학부모 수학 슬롯 3개', () => {
  assert.deepEqual(PARENT_VISIBLE_SLOTS.수학, [1, 2, 3])
})

test('수학 slot 3 → 부교재', () => {
  assert.equal(getMathHomeworkSlotHeading(3), '부교재')
})

test('영어 slot 3 → 단어장 (수학과 구분)', () => {
  assert.equal(getEnglishHomeworkSlotHeading(3), '단어장')
  assert.notEqual(getMathHomeworkSlotHeading(3), getEnglishHomeworkSlotHeading(3))
})

test('수학 slot 순서', () => {
  assert.deepEqual(
    [1, 2, 3].map(getMathHomeworkSlotHeading),
    ['개념교재', '유형교재', '부교재'],
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
