/**
 * 실행: node --experimental-strip-types src/utils/progressRecord.history.test.ts
 */
import assert from 'node:assert/strict'
import type { ProgressRecord } from '../types/records.ts'
import {
  findProgressRecordIndex,
  findProgressRecordIndexForDate,
} from './progressRecord.ts'

function progress(id: string, date: string, currentProgress: string): ProgressRecord {
  return {
    id,
    studentId: 'stu-1',
    subject: '수학',
    slotNumber: 1,
    textbookName: '집합과 명제',
    currentProgress,
    currentPage: 10,
    totalPage: 100,
    progressRate: 10,
    lastStudyDate: date,
    teacherMemo: '',
    createdAt: '',
    updatedAt: '',
  }
}

const day1 = progress('id-day1', '2026-09-03', 'day1')
const day2 = progress('id-day2', '2026-09-04', 'day2')
const rows = [day1, day2]

assert.equal(
  findProgressRecordIndexForDate(rows, {
    id: '',
    studentId: 'stu-1',
    subject: '수학',
    slotNumber: 1,
    lastStudyDate: '2026-09-04',
  }),
  1,
)
assert.equal(
  findProgressRecordIndexForDate(rows, {
    id: '',
    studentId: 'stu-1',
    subject: '수학',
    slotNumber: 1,
    lastStudyDate: '2026-09-03',
  }),
  0,
)
assert.equal(
  findProgressRecordIndexForDate(rows, {
    id: '',
    studentId: 'stu-1',
    subject: '수학',
    slotNumber: 1,
    lastStudyDate: '2026-09-05',
  }),
  -1,
)

const undatedIndex = findProgressRecordIndex(rows, {
  id: '',
  studentId: 'stu-1',
  subject: '수학',
  slotNumber: 1,
})
assert.ok(undatedIndex >= 0)
assert.notEqual(
  findProgressRecordIndexForDate(rows, {
    id: '',
    studentId: 'stu-1',
    subject: '수학',
    slotNumber: 1,
    lastStudyDate: '2026-09-04',
  }),
  findProgressRecordIndexForDate(rows, {
    id: '',
    studentId: 'stu-1',
    subject: '수학',
    slotNumber: 1,
    lastStudyDate: '2026-09-03',
  }),
)

console.log('progressRecord.history OK')
