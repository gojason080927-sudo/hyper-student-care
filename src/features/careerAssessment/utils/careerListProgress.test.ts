/**
 * 실행: npx tsx src/features/careerAssessment/utils/careerListProgress.test.ts
 */
import assert from 'node:assert/strict'
import { deriveCareerListProgress } from './careerListProgress.ts'

const none = deriveCareerListProgress()
assert.equal(none.label, '미시작')
assert.equal(none.answeredCount, 0)
assert.equal(none.percent, 0)

const zero = deriveCareerListProgress({ status: 'not_started', answeredCount: 0 })
assert.equal(zero.label, '미시작')
assert.equal(zero.answeredCount, 0)

const five = deriveCareerListProgress({ status: 'not_started', answeredCount: 5 })
assert.equal(five.label, '검사중')
assert.equal(five.answeredCount, 5)
assert.equal(five.percent, 6)

const ten = deriveCareerListProgress({ status: 'in_progress', answeredCount: 10 })
assert.equal(ten.label, '검사중')
assert.equal(ten.answeredCount, 10)
assert.equal(ten.percent, 11)

const done = deriveCareerListProgress({
  status: 'completed',
  answeredCount: 88,
  latestResultId: 'r1',
})
assert.equal(done.label, '완료')
assert.equal(done.answeredCount, 88)
assert.equal(done.percent, 100)

console.log('careerListProgress tests OK')
