/**
 * 수학 A/B 그룹 연동 helper 테스트 (node scripts/test-math-shared-group.mjs)
 */
import assert from 'node:assert/strict'

const CLASS_OPTIONS_BY_GRADE = {
  중1: ['중1 수학', '중1 영어', '중1 영수A', '중1 영수B'],
  중3: ['중3 수학A', '중3 수학B', '중3 영어', '중3 영수A', '중3 영수B'],
  고1: ['고1 수학A', '고1 수학B', '고1 영어', '고1 영수A', '고1 영수B'],
  중2: ['중2 수학', '중2 영어', '중2 영수'],
}

function gradeHasMathAbLinkStructure(grade) {
  const options = CLASS_OPTIONS_BY_GRADE[grade] ?? []
  return (
    options.some((o) => o.endsWith(' 수학A')) &&
    options.some((o) => o.endsWith(' 수학B')) &&
    options.some((o) => o.endsWith(' 영수A')) &&
    options.some((o) => o.endsWith(' 영수B'))
  )
}

function getMathSharedGroup(grade, className) {
  const trimmed = className.trim()
  if (!gradeHasMathAbLinkStructure(grade)) return null
  if (trimmed.endsWith('수학A') || trimmed.endsWith('영수A')) return 'A'
  if (trimmed.endsWith('수학B') || trimmed.endsWith('영수B')) return 'B'
  return null
}

function getMathSharedGroupKey(grade, className) {
  const group = getMathSharedGroup(grade, className)
  return group ? `${grade}-math-${group}` : null
}

function getMathSharedLinkedClassNames(grade, className) {
  const trimmed = className.trim()
  const group = getMathSharedGroup(grade, trimmed)
  if (!group) return [trimmed]
  const mathClass = `${grade} 수학${group}`
  const engClass = `${grade} 영수${group}`
  if (trimmed === mathClass) return [mathClass, engClass]
  if (trimmed === engClass) return [engClass, mathClass]
  return [trimmed]
}

function classNamesForClassCommonLookup(grade, className, subject) {
  if (subject === '수학') return getMathSharedLinkedClassNames(grade, className)
  return [className.trim()]
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

test('중3·고1 A/B 구조 감지', () => {
  assert.equal(gradeHasMathAbLinkStructure('중3'), true)
  assert.equal(gradeHasMathAbLinkStructure('고1'), true)
  assert.equal(gradeHasMathAbLinkStructure('중1'), false)
  assert.equal(gradeHasMathAbLinkStructure('중2'), false)
})

test('중3 수학A ↔ 영수A 연동 키', () => {
  assert.equal(getMathSharedGroupKey('중3', '중3 수학A'), '중3-math-A')
  assert.equal(getMathSharedGroupKey('중3', '중3 영수A'), '중3-math-A')
  assert.deepEqual(getMathSharedLinkedClassNames('중3', '중3 수학A'), [
    '중3 수학A',
    '중3 영수A',
  ])
  assert.deepEqual(getMathSharedLinkedClassNames('중3', '중3 영수A'), [
    '중3 영수A',
    '중3 수학A',
  ])
})

test('중3 B그룹 분리', () => {
  assert.equal(getMathSharedGroupKey('중3', '중3 수학B'), '중3-math-B')
  assert.notEqual(getMathSharedGroupKey('중3', '중3 수학A'), getMathSharedGroupKey('중3', '중3 수학B'))
  const aLinked = getMathSharedLinkedClassNames('중3', '중3 수학A')
  const bLinked = getMathSharedLinkedClassNames('중3', '중3 수학B')
  assert.equal(aLinked.includes('중3 수학B'), false)
  assert.equal(bLinked.includes('중3 영수A'), false)
})

test('고1 수학B ↔ 영수B', () => {
  assert.deepEqual(getMathSharedLinkedClassNames('고1', '고1 영수B'), [
    '고1 영수B',
    '고1 수학B',
  ])
})

test('중1·중2 연동 없음', () => {
  assert.equal(getMathSharedGroupKey('중1', '중1 수학'), null)
  assert.equal(getMathSharedGroupKey('중1', '중1 영수A'), null)
  assert.deepEqual(getMathSharedLinkedClassNames('중2', '중2 수학'), ['중2 수학'])
})

test('영어는 반 단위 lookup', () => {
  assert.deepEqual(classNamesForClassCommonLookup('중3', '중3 영수A', '영어'), ['중3 영수A'])
  assert.deepEqual(classNamesForClassCommonLookup('중3', '중3 수학A', '수학'), [
    '중3 수학A',
    '중3 영수A',
  ])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
