/**
 * 실행: node --experimental-strip-types src/lib/db/mergeTodayReport.test.ts
 */
import assert from 'node:assert/strict'
import type { DailyTestRecord } from '../../types/records.ts'
import { mergeTodayReportIntoState } from './mergeTodayReport.ts'
import type { TodayReportData } from '../dataLoader.ts'

function dailyTest(id: string, date: string, subject: string): DailyTestRecord {
  return {
    id,
    studentId: 'stu-1',
    date,
    testName: `${subject} 테스트`,
    subject,
    score: 90,
    totalScore: 100,
    percentage: 90,
    incorrectCount: 0,
    memo: '',
    sessionResults: [],
    learningDiagnosis: {
      teacherFeedback: `${subject} 피드백`,
    } as DailyTestRecord['learningDiagnosis'],
    createdAt: '',
    updatedAt: '',
  }
}

function emptyCurrent() {
  return {
    attendance: [],
    progress: [],
    assignmentCompletion: [],
    homework: [],
    homeworkTextbookEntries: [],
    studentTextbookSlots: [],
    todayAssignments: [],
    classNotes: [],
    dailyTests: [],
  }
}

function emptyReport(overrides: Partial<TodayReportData> = {}): TodayReportData {
  return {
    attendance: null,
    progress: [],
    assignmentCompletion: [],
    homework: null,
    todayAssignment: null,
    classNote: null,
    dailyTest: null,
    dailyTests: [],
    ...overrides,
  }
}

const math = dailyTest('dt-math', '2026-09-03', '수학')
const english = dailyTest('dt-eng', '2026-09-03', '영어')

const legacySingular = mergeTodayReportIntoState(
  { ...emptyCurrent(), dailyTests: [math, english] },
  emptyReport({ dailyTest: math, dailyTests: [math] }),
  { studentId: 'stu-1', date: '2026-09-03' },
)
assert.equal(legacySingular.dailyTests.length, 2)
assert.ok(legacySingular.dailyTests.some((row) => row.subject === '영어'))
assert.ok(legacySingular.dailyTests.some((row) => row.subject === '수학'))

const completeEmpty = mergeTodayReportIntoState(
  { ...emptyCurrent(), dailyTests: [math, english] },
  emptyReport({ dailyTests: [], dailyTestsComplete: true }),
  { studentId: 'stu-1', date: '2026-09-03' },
)
assert.equal(completeEmpty.dailyTests.length, 0)

const completeBoth = mergeTodayReportIntoState(
  emptyCurrent(),
  emptyReport({ dailyTests: [math, english], dailyTestsComplete: true }),
  { studentId: 'stu-1', date: '2026-09-03' },
)
assert.equal(completeBoth.dailyTests.length, 2)

const otherDateKept = mergeTodayReportIntoState(
  {
    ...emptyCurrent(),
    dailyTests: [dailyTest('dt-today', '2026-09-10', '수학'), math],
  },
  emptyReport({ dailyTests: [english], dailyTestsComplete: true }),
  { studentId: 'stu-1', date: '2026-09-03' },
)
assert.ok(otherDateKept.dailyTests.some((row) => row.date === '2026-09-10'))
assert.equal(otherDateKept.dailyTests.filter((row) => row.date === '2026-09-03').length, 1)
assert.equal(otherDateKept.dailyTests.find((row) => row.date === '2026-09-03')?.subject, '영어')

console.log('mergeTodayReport OK')
