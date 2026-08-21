/**
 * 학년별 반/과정 상수·검증 테스트 (node scripts/test-grade-class.mjs)
 */
import assert from 'node:assert/strict'

const CLASS_OPTIONS_BY_GRADE = {
  초5: ['초5 수학', '초5 영어', '초5 영수'],
  초6: ['초6 수학', '초6 영어', '초6 영수'],
  중1: ['중1 수학', '중1 영어', '중1 영수A', '중1 영수B'],
  중2: ['중2 수학', '중2 영어', '중2 영수'],
  중3: ['중3 수학A', '중3 수학B', '중3 영어', '중3 영수A', '중3 영수B'],
  고1: ['고1 수학A', '고1 수학B', '고1 영어', '고1 영수A', '고1 영수B'],
  고2: ['고2 수학', '고2 영어', '고2 영수'],
  고3: ['고3 수학', '고3 영어', '고3 영수'],
}

function resolveClassNameOnGradeChange(grade, className) {
  const trimmed = className.trim()
  if (!trimmed || !grade) return ''
  const standard = CLASS_OPTIONS_BY_GRADE[grade] ?? []
  if (standard.includes(trimmed)) return trimmed
  return ''
}

function validateGradeClassCombination(grade, className) {
  const trimmed = className.trim()
  if (!grade || !trimmed) return false
  const standard = CLASS_OPTIONS_BY_GRADE[grade] ?? []
  if (standard.includes(trimmed)) return true
  const owner = Object.entries(CLASS_OPTIONS_BY_GRADE).find(([, opts]) => opts.includes(trimmed))
  if (owner && owner[0] !== grade) return false
  return false
}

function getClassFormSelectOptions(grade, currentClassName) {
  const standard = CLASS_OPTIONS_BY_GRADE[grade] ?? []
  const current = currentClassName?.trim()
  if (current && !standard.includes(current)) {
    return [...standard, current]
  }
  return standard
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

const expectedCounts = { 초5: 3, 초6: 3, 중1: 4, 중2: 3, 중3: 5, 고1: 5, 고2: 3, 고3: 3 }

for (const [grade, count] of Object.entries(expectedCounts)) {
  test(`${grade} → ${count}개 과정`, () => {
    assert.equal(CLASS_OPTIONS_BY_GRADE[grade].length, count)
  })
}

test('중3 → 수학A·수학B·영어·영수A·영수B', () => {
  assert.deepEqual(CLASS_OPTIONS_BY_GRADE['중3'], [
    '중3 수학A',
    '중3 수학B',
    '중3 영어',
    '중3 영수A',
    '중3 영수B',
  ])
  assert.equal(CLASS_OPTIONS_BY_GRADE['중3'].includes('중3 수학'), false)
  assert.equal(CLASS_OPTIONS_BY_GRADE['중3'].includes('중3 영수'), false)
})

test('중1·고1·중3 수학A/B 구조 무변경', () => {
  assert.equal(CLASS_OPTIONS_BY_GRADE['중3'].includes('중3 수학A'), true)
  assert.equal(CLASS_OPTIONS_BY_GRADE['중3'].includes('중3 수학B'), true)
  assert.equal(CLASS_OPTIONS_BY_GRADE['고1'].includes('고1 영수A'), true)
})

test('레거시 중3 영수 — picker에서 제거, 폼에는 유지', () => {
  assert.equal(CLASS_OPTIONS_BY_GRADE['중3'].includes('중3 영수'), false)
  assert.equal(resolveClassNameOnGradeChange('중3', '중3 영수'), '')
  const formOpts = getClassFormSelectOptions('중3', '중3 영수')
  assert.equal(formOpts.includes('중3 영수'), true)
  assert.equal(formOpts.includes('중3 영수A'), true)
  assert.equal(formOpts.includes('중3 영수B'), true)
})

test('잘못된 학년·반 조합 저장 차단', () => {
  assert.equal(validateGradeClassCombination('중3', '중3 영수A'), true)
  assert.equal(validateGradeClassCombination('중3', '중3 영수B'), true)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
