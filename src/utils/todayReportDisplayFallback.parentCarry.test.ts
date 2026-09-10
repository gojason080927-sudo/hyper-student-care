/**
 * 학부모 Today Report 4항목: 오늘 값 없으면 최근 저장값 표시 (DB 복사 없음)
 * npx vite-node src/utils/todayReportDisplayFallback.parentCarry.test.ts
 */
import assert from 'node:assert/strict'
import type {
  AttendanceRecord,
  ClassTodayReportCommon,
  DailyTestRecord,
  HomeworkTextbookEntry,
  TodayAssignmentRecord,
} from '../types/records'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis'
import { buildParentHomeworkTextbookDisplays } from './textbookSlots'
import {
  findHomeworkPerformanceEntryForDisplay,
  findLatestAttendanceForDisplay,
  findLatestDailyTestsForDisplay,
  findLatestTodayAssignmentRecordForDisplay,
  resolveParentTodayAssignmentText,
} from './todayReportDisplayFallback'

const ts = '2026-08-24T00:00:00.000Z'
const studentA = 'stu-a'
const studentB = 'stu-b'
const day1 = '2026-08-24'
const day2 = '2026-08-25'
const day3 = '2026-08-26'

function attendance(
  studentId: string,
  date: string,
  status: AttendanceRecord['status'],
): AttendanceRecord {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    status,
    reason: '',
    memo: '',
    createdAt: ts,
    updatedAt: ts,
  }
}

function assignment(
  studentId: string,
  date: string,
  text: string,
): TodayAssignmentRecord {
  return {
    id: `asg-${studentId}-${date}`,
    studentId,
    date,
    assignment1: '',
    assignment2: text,
    createdAt: ts,
    updatedAt: ts,
  }
}

function dailyTest(
  studentId: string,
  date: string,
  subject: string,
  memo: string,
): DailyTestRecord {
  return {
    id: `dt-${studentId}-${date}-${subject}`,
    studentId,
    date,
    testName: memo,
    subject,
    score: 90,
    totalScore: 100,
    percentage: 90,
    incorrectCount: 1,
    memo,
    sessionResults: [{ session: 1, status: '합격', score: 90, totalScore: 100 }],
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    createdAt: ts,
    updatedAt: ts,
  }
}

function hwEntry(
  studentId: string,
  date: string,
  status: HomeworkTextbookEntry['status'] | '',
  todayAssignment: string,
): HomeworkTextbookEntry {
  return {
    id: `hw-${studentId}-${date}`,
    studentId,
    date,
    subject: '수학',
    slotNumber: 1,
    previousAssignment: '',
    todayAssignment,
    status,
    createdAt: ts,
    updatedAt: ts,
  }
}

function common(date: string, todayAssignment: string): ClassTodayReportCommon {
  return {
    id: `common-${date}`,
    grade: '고1',
    className: '고1 수학A',
    reportDate: date,
    subject: '수학',
    slotNumber: 1,
    textbookName: '일품',
    currentProgress: '',
    currentPage: 0,
    totalPage: 0,
    previousAssignment: '',
    todayAssignment,
    createdAt: ts,
    updatedAt: ts,
  }
}

const day1Attendance = [
  attendance(studentA, day1, '출석'),
  attendance(studentB, day1, '결석'),
]
assert.equal(findLatestAttendanceForDisplay(day1Attendance, studentA, day1)?.status, '출석')
assert.equal(findLatestAttendanceForDisplay(day1Attendance, studentA, day2)?.status, '출석')
assert.equal(findLatestAttendanceForDisplay(day1Attendance, studentB, day2)?.status, '결석')

const day3Attendance = [
  ...day1Attendance,
  attendance(studentA, day3, '지각'),
]
assert.equal(findLatestAttendanceForDisplay(day3Attendance, studentA, day3)?.status, '지각')
assert.equal(findLatestAttendanceForDisplay(day3Attendance, studentB, day3)?.status, '결석')

const day1Assign = [assignment(studentA, day1, '수학 30~45번')]
assert.equal(
  findLatestTodayAssignmentRecordForDisplay(day1Assign, studentA, day2)?.assignment2,
  '수학 30~45번',
)
const day3Assign = [...day1Assign, assignment(studentA, day3, '수학 46~60번')]
assert.equal(
  findLatestTodayAssignmentRecordForDisplay(day3Assign, studentA, day3)?.assignment2,
  '수학 46~60번',
)
assert.equal(
  findLatestTodayAssignmentRecordForDisplay(day3Assign, studentB, day3),
  undefined,
)

const day1Tests = [dailyTest(studentA, day1, '수학', '1차 / 90점 / 합격')]
assert.equal(findLatestDailyTestsForDisplay(day1Tests, studentA, day2)[0]?.memo, '1차 / 90점 / 합격')
const day3Tests = [...day1Tests, dailyTest(studentA, day3, '수학', '2차 / 88점 / 합격')]
assert.equal(findLatestDailyTestsForDisplay(day3Tests, studentA, day3)[0]?.memo, '2차 / 88점 / 합격')
assert.equal(findLatestDailyTestsForDisplay(day3Tests, studentB, day3).length, 0)

const day1Hw = [hwEntry(studentA, day1, '완료', '수학 30~45번')]
assert.equal(
  findHomeworkPerformanceEntryForDisplay(day1Hw, studentA, day2, '수학', 1).entry?.status,
  '완료',
)
const emptyDay2Hw = [hwEntry(studentA, day2, '', '')]
assert.equal(
  findHomeworkPerformanceEntryForDisplay(
    [...day1Hw, ...emptyDay2Hw],
    studentA,
    day2,
    '수학',
    1,
  ).entry?.status,
  '완료',
)
const day3Hw = [...day1Hw, hwEntry(studentA, day3, '부분 완료', '수학 46~60번')]
assert.equal(
  findHomeworkPerformanceEntryForDisplay(day3Hw, studentA, day3, '수학', 1).entry?.status,
  '부분 완료',
)

assert.equal(
  resolveParentTodayAssignmentText({
    entries: day1Hw,
    commonRecords: [common(day1, '수학 30~45번')],
    grade: '고1',
    className: '고1 수학A',
    studentId: studentA,
    date: day2,
    subject: '수학',
    slotNumber: 1,
  }),
  '수학 30~45번',
)
assert.equal(
  resolveParentTodayAssignmentText({
    entries: day3Hw,
    commonRecords: [common(day1, '수학 30~45번'), common(day3, '수학 46~60번')],
    grade: '고1',
    className: '고1 수학A',
    studentId: studentA,
    date: day3,
    subject: '수학',
    slotNumber: 1,
  }),
  '수학 46~60번',
)

const parentDay2 = buildParentHomeworkTextbookDisplays(
  studentA,
  day2,
  [],
  [...day1Hw, ...emptyDay2Hw],
  {
    grade: '고1',
    className: '고1 수학A',
    commonRecords: [common(day1, '수학 30~45번'), common(day2, '')],
  },
)
const math1Day2 = parentDay2.find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(math1Day2?.status, '완료')
assert.equal(math1Day2?.todayAssignment, '수학 30~45번')

const parentDay3 = buildParentHomeworkTextbookDisplays(studentA, day3, [], day3Hw, {
  grade: '고1',
  className: '고1 수학A',
  commonRecords: [common(day1, '수학 30~45번'), common(day3, '수학 46~60번')],
})
const math1Day3 = parentDay3.find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(math1Day3?.status, '부분 완료')
assert.equal(math1Day3?.todayAssignment, '수학 46~60번')

console.log('parent today-report carry-forward tests passed.')
