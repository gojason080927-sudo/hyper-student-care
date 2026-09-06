/**
 * 실행: npx tsx src/features/careerAssessment/utils/careerListProgress.test.ts
 */
import assert from 'node:assert/strict'
import { filterStudents } from '../../../utils/filters.ts'
import {
  deriveCareerListProgress,
  mergeStudentsById,
  missingCareerStudentIds,
} from './careerListProgress.ts'

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

const missing = missingCareerStudentIds(
  ['roster-1', '3fcd2905-075a-4a5c-8035-4a44f89a1e93'],
  ['roster-1'],
)
assert.deepEqual(missing, ['3fcd2905-075a-4a5c-8035-4a44f89a1e93'])

const merged = mergeStudentsById(
  [{ id: 'roster-1', name: '기존' }],
  [{ id: '3fcd2905-075a-4a5c-8035-4a44f89a1e93', name: '진로검사 테스트학생' }],
)
assert.equal(merged.length, 2)
assert.equal(merged.some((row) => row.name === '진로검사 테스트학생'), true)

const searchable = filterStudents(
  [
    {
      id: '3fcd2905-075a-4a5c-8035-4a44f89a1e93',
      name: '진로검사 테스트학생',
      studentAccessKey: 'x',
      accessKeyActive: true,
      school: 'HYPER TEST',
      grade: '고1',
      studentPhone: '',
      parentPhone: '',
      className: 'CAREER-TEST',
      subjects: [],
      teacher: '',
      enrollmentDate: '2026-09-06',
      status: '재원',
      memo: '',
      createdAt: '',
      updatedAt: '',
    },
  ],
  { search: '진로검사', school: '', grade: '', className: '', status: '', subject: '' },
)
assert.equal(searchable.length, 1)

console.log('careerListProgress tests OK')
