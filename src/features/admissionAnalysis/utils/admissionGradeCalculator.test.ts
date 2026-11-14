/**
 * admissionGradeCalculator 경계값·예시 테스트
 * 실행: npx tsx src/features/admissionAnalysis/utils/admissionGradeCalculator.test.ts
 */
import assert from 'node:assert/strict'
import {
  averageGrade,
  calcGrade5FromPercentile,
  calcGrade9FromPercentile,
  calcPercentile,
  calcSubjectAdmission,
  formatPercentile,
  validateRankInput,
} from './admissionGradeCalculator'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

section('5등급 경계')
assert.equal(calcGrade5FromPercentile(10), 1)
assert.equal(calcGrade5FromPercentile(10.01), 2)
assert.equal(calcGrade5FromPercentile(34), 2)
assert.equal(calcGrade5FromPercentile(34.01), 3)
assert.equal(calcGrade5FromPercentile(66), 3)
assert.equal(calcGrade5FromPercentile(66.01), 4)
assert.equal(calcGrade5FromPercentile(90), 4)
assert.equal(calcGrade5FromPercentile(90.01), 5)
console.log('5등급 경계 OK')

section('9등급 경계')
assert.equal(calcGrade9FromPercentile(4), 1)
assert.equal(calcGrade9FromPercentile(4.01), 2)
assert.equal(calcGrade9FromPercentile(11), 2)
assert.equal(calcGrade9FromPercentile(11.01), 3)
assert.equal(calcGrade9FromPercentile(23), 3)
assert.equal(calcGrade9FromPercentile(23.01), 4)
assert.equal(calcGrade9FromPercentile(40), 4)
assert.equal(calcGrade9FromPercentile(40.01), 5)
assert.equal(calcGrade9FromPercentile(60), 5)
assert.equal(calcGrade9FromPercentile(60.01), 6)
assert.equal(calcGrade9FromPercentile(77), 6)
assert.equal(calcGrade9FromPercentile(77.01), 7)
assert.equal(calcGrade9FromPercentile(89), 7)
assert.equal(calcGrade9FromPercentile(89.01), 8)
assert.equal(calcGrade9FromPercentile(96), 8)
assert.equal(calcGrade9FromPercentile(96.01), 9)
console.log('9등급 경계 OK')

section('33 / 255')
const p = calcPercentile(33, 255)
assert.ok(Math.abs(p - (33 / 255) * 100) < 1e-9)
assert.equal(formatPercentile(p), '12.94')
const result = calcSubjectAdmission(33, 255)
assert.equal(result.grade5, 2)
assert.equal(result.grade9, 3)
console.log(
  `percentile=${formatPercentile(result.percentile)}% grade5=${result.grade5} grade9=${result.grade9}`,
)

section('검증')
assert.equal(validateRankInput(33, 255).ok, true)
assert.equal(validateRankInput(256, 255).ok, false)
assert.equal(validateRankInput(0, 255).ok, false)
assert.equal(validateRankInput(1, 0).ok, false)

section('평균')
assert.equal(averageGrade([2, 1, 2, 2, 1]), 1.6)
assert.equal(averageGrade([]), null)

console.log('\nAll admissionGradeCalculator tests passed.')
