/**
 * 실행: node --experimental-strip-types src/utils/todayReportHistoryLookup.test.ts
 */
import assert from 'node:assert/strict'
import type {
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
} from '../types/records.ts'
import {
  findHomeworkPerformanceEntryForDisplay,
  findProgressRecordForDisplay,
  resolveParentTodayReportDisplaySource,
  studentHasReportContentOnDate,
} from './todayReportDisplayFallback.ts'
import { buildParentHomeworkTextbookDisplays, buildParentProgressTextbookDisplays } from './textbookSlots.ts'

const studentId = 'stu-1'
const day7 = '2026-09-03'
const day6 = '2026-09-04'
const today = '2026-09-10'
const emptyDay = '2026-09-05'

function attendance(date: string, status: AttendanceRecord['status']): AttendanceRecord {
  return {
    id: `att-${date}`,
    studentId,
    date,
    status,
    reason: '',
    memo: '',
    createdAt: '',
    updatedAt: '',
  }
}

function progress(date: string, currentProgress: string): ProgressRecord {
  return {
    id: `prg-${date}`,
    studentId,
    subject: '수학',
    slotNumber: 1,
    textbookName: '집합과 명제',
    currentProgress,
    currentPage: 32,
    totalPage: 100,
    progressRate: 32,
    lastStudyDate: date,
    teacherMemo: '',
    createdAt: '',
    updatedAt: '',
  }
}

function homework(date: string, previousAssignment: string, status: HomeworkTextbookEntry['status']): HomeworkTextbookEntry {
  return {
    id: `hw-${date}`,
    studentId,
    date,
    subject: '수학',
    slotNumber: 1,
    previousAssignment,
    todayAssignment: `${date} 과제`,
    status,
    createdAt: '',
    updatedAt: '',
  }
}

function note(date: string, text: string): ClassNoteRecord {
  return {
    id: `note-${date}`,
    studentId,
    date,
    hasClassNote: true,
    note: text,
    createdAt: '',
    updatedAt: '',
  }
}

function dailyTest(date: string, score: number): DailyTestRecord {
  return {
    id: `dt-${date}`,
    studentId,
    date,
    testName: '일일테스트',
    subject: '수학',
    score,
    totalScore: 100,
    percentage: score,
    incorrectCount: 0,
    memo: '',
    sessionResults: [],
    learningDiagnosis: {
      teacherFeedback: `${date} 피드백`,
    } as DailyTestRecord['learningDiagnosis'],
    createdAt: '',
    updatedAt: '',
  }
}

const attendanceRows = [
  attendance(day7, '출석'),
  attendance(day6, '지각'),
  attendance(today, '조퇴'),
]
const progressRows = [
  progress(day7, '집합과 명제 p.32~37'),
  progress(day6, '집합과 명제 p.38~43'),
  progress(today, '집합과 명제 p.90~95'),
]
const homeworkRows = [
  homework(day7, '과제 A', '완료'),
  homework(day6, '과제 B', '미완료'),
  homework(today, '과제 C', '부분 완료'),
]
const notes = [note(day7, '특이사항 A'), note(day6, '특이사항 B'), note(today, '특이사항 C')]
const tests = [dailyTest(day7, 90), dailyTest(day6, 85), dailyTest(today, 70)]

const lookupBase = {
  studentId,
  progressRecords: progressRows,
  homeworkTextbookEntries: homeworkRows,
  attendance: attendanceRows,
  dailyTests: tests,
  todayAssignments: [],
  classNotes: notes,
  classTodayReportCommon: [],
  grade: '고1',
  className: '고1 수학A',
}

assert.equal(
  studentHasReportContentOnDate({ ...lookupBase, date: day7 }),
  true,
)
assert.equal(
  studentHasReportContentOnDate({ ...lookupBase, date: emptyDay }),
  false,
)

const historical7 = resolveParentTodayReportDisplaySource({
  ...lookupBase,
  selectedDate: day7,
  allowCarryForward: false,
})
assert.deepEqual(historical7, { displayDate: day7, isFallback: false })

const historicalEmpty = resolveParentTodayReportDisplaySource({
  ...lookupBase,
  selectedDate: emptyDay,
  allowCarryForward: false,
})
assert.deepEqual(historicalEmpty, { displayDate: emptyDay, isFallback: false })

const todayCarry = resolveParentTodayReportDisplaySource({
  ...lookupBase,
  selectedDate: today,
  allowCarryForward: true,
})
assert.equal(todayCarry.displayDate, today)
assert.equal(todayCarry.isFallback, false)

const todayEmptyCarry = resolveParentTodayReportDisplaySource({
  ...lookupBase,
  selectedDate: '2026-09-11',
  allowCarryForward: true,
})
assert.equal(todayEmptyCarry.isFallback, true)
assert.equal(todayEmptyCarry.displayDate, today)

assert.equal(
  findProgressRecordForDisplay(progressRows, studentId, day7, '수학', 1, { allowCarryForward: false }).record
    ?.currentProgress,
  '집합과 명제 p.32~37',
)
assert.equal(
  findProgressRecordForDisplay(progressRows, studentId, day6, '수학', 1, { allowCarryForward: false }).record
    ?.currentProgress,
  '집합과 명제 p.38~43',
)
assert.equal(
  findProgressRecordForDisplay(progressRows, studentId, emptyDay, '수학', 1, { allowCarryForward: false }).record,
  undefined,
)

const todayProgressCarry = findProgressRecordForDisplay(progressRows, studentId, '2026-09-11', '수학', 1, {
  allowCarryForward: true,
})
assert.equal(todayProgressCarry.isFallback, true)
assert.equal(todayProgressCarry.record?.currentProgress, '집합과 명제 p.90~95')

assert.equal(
  findHomeworkPerformanceEntryForDisplay(homeworkRows, studentId, day7, '수학', 1, { allowCarryForward: false })
    .entry?.previousAssignment,
  '과제 A',
)
assert.equal(
  findHomeworkPerformanceEntryForDisplay(homeworkRows, studentId, day6, '수학', 1, { allowCarryForward: false })
    .entry?.status,
  '미완료',
)
assert.equal(
  findHomeworkPerformanceEntryForDisplay(homeworkRows, studentId, emptyDay, '수학', 1, { allowCarryForward: false })
    .entry,
  undefined,
)

const hw7 = buildParentHomeworkTextbookDisplays(studentId, day7, [], homeworkRows, undefined, {
  allowCarryForward: false,
})
const hw6 = buildParentHomeworkTextbookDisplays(studentId, day6, [], homeworkRows, undefined, {
  allowCarryForward: false,
})
const hwEmpty = buildParentHomeworkTextbookDisplays(studentId, emptyDay, [], homeworkRows, undefined, {
  allowCarryForward: false,
})
assert.equal(hw7[0]?.previousAssignment, '과제 A')
assert.equal(hw7[0]?.status, '완료')
assert.equal(hw6[0]?.previousAssignment, '과제 B')
assert.equal(hw6[0]?.status, '미완료')
assert.equal(hwEmpty.length, 0)

const pg7 = buildParentProgressTextbookDisplays(studentId, day7, [], progressRows, undefined, {
  allowCarryForward: false,
})
const pg6 = buildParentProgressTextbookDisplays(studentId, day6, [], progressRows, undefined, {
  allowCarryForward: false,
})
assert.equal(pg7[0]?.currentProgress, '집합과 명제 p.32~37')
assert.equal(pg6[0]?.currentProgress, '집합과 명제 p.38~43')

const sameDayEdit = [
  ...progressRows.filter((row) => row.lastStudyDate !== day7),
  progress(day7, '집합과 명제 p.32~37 수정'),
]
assert.equal(
  findProgressRecordForDisplay(sameDayEdit, studentId, day7, '수학', 1, { allowCarryForward: false }).record
    ?.currentProgress,
  '집합과 명제 p.32~37 수정',
)
assert.equal(
  findProgressRecordForDisplay(sameDayEdit, studentId, day6, '수학', 1, { allowCarryForward: false }).record
    ?.currentProgress,
  '집합과 명제 p.38~43',
)

console.log('todayReportHistoryLookup OK')
