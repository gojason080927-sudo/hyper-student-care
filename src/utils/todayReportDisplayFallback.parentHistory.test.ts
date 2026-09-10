/**
 * 학부모 Today Report 날짜별 history: 과거 날짜는 실제 저장값만
 * npx vite-node src/utils/todayReportDisplayFallback.parentHistory.test.ts
 */
import assert from 'node:assert/strict'
import type {
  AttendanceRecord,
  ClassNoteRecord,
  ClassTodayReportCommon,
  DailyTestRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  TodayAssignmentRecord,
} from '../types/records'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis'
import {
  buildParentHomeworkTextbookDisplays,
  buildParentProgressTextbookDisplays,
} from './textbookSlots'
import {
  findAttendanceOnDate,
  findDailyTestsOnDate,
  findLatestAttendanceForDisplay,
  findLatestDailyTestsForDisplay,
  hasParentTodayReportContentOnDate,
  resolveParentTodayReportDisplaySource,
} from './todayReportDisplayFallback'
import { findProgressRecordIndexForDate } from './progressRecord'

const ts = '2026-09-10T00:00:00.000Z'
const studentId = 'stu-history'
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
    createdAt: ts,
    updatedAt: ts,
  }
}

function progress(date: string, text: string): ProgressRecord {
  return {
    id: `prog-${date}`,
    studentId,
    subject: '수학',
    slotNumber: 1,
    textbookName: '집합과 명제',
    currentProgress: text,
    currentPage: 0,
    totalPage: 0,
    progressRate: 0,
    lastStudyDate: date,
    teacherMemo: '',
    createdAt: ts,
    updatedAt: ts,
  }
}

function hw(
  date: string,
  status: HomeworkTextbookEntry['status'],
  previous: string,
  todayAssignment: string,
): HomeworkTextbookEntry {
  return {
    id: `hw-${date}`,
    studentId,
    date,
    subject: '수학',
    slotNumber: 1,
    previousAssignment: previous,
    todayAssignment,
    status,
    createdAt: ts,
    updatedAt: ts,
  }
}

function dailyTest(date: string, memo: string, score: number): DailyTestRecord {
  return {
    id: `dt-${date}`,
    studentId,
    date,
    testName: memo,
    subject: '수학',
    score,
    totalScore: 100,
    percentage: score,
    incorrectCount: 1,
    memo,
    sessionResults: [{ session: 1, status: '합격', score, totalScore: 100 }],
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    createdAt: ts,
    updatedAt: ts,
  }
}

function note(date: string, text: string): ClassNoteRecord {
  return {
    id: `note-${date}`,
    studentId,
    date,
    hasClassNote: Boolean(text),
    note: text,
    createdAt: ts,
    updatedAt: ts,
  }
}

function common(date: string, progressText: string, assignment: string): ClassTodayReportCommon {
  return {
    id: `common-${date}`,
    grade: '고1',
    className: '고1 수학A',
    reportDate: date,
    subject: '수학',
    slotNumber: 1,
    textbookName: '집합과 명제',
    currentProgress: progressText,
    currentPage: 0,
    totalPage: 0,
    previousAssignment: '',
    todayAssignment: assignment,
    createdAt: ts,
    updatedAt: ts,
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
  progress(today, '집합과 명제 p.70~75'),
]
const homeworkRows = [
  hw(day7, '완료', '지난 A', 'p.38~42'),
  hw(day6, '미완료', '지난 B', 'p.44~48'),
  hw(today, '부분 완료', '지난 C', 'p.76~80'),
]
const dailyTestRows = [
  dailyTest(day7, '2차시 90점', 90),
  dailyTest(day6, '1차시 85점', 85),
  dailyTest(today, '3차시 95점', 95),
]
const classNotes = [
  note(day7, '오답 문제 다시 풀이함'),
  note(day6, '과제 보충 필요'),
  note(today, '오늘 피드백'),
]
const commonRows = [
  common(day7, '집합과 명제 p.32~37', 'p.38~42'),
  common(day6, '집합과 명제 p.38~43', 'p.44~48'),
  common(today, '집합과 명제 p.70~75', 'p.76~80'),
]
const todayAssignments: TodayAssignmentRecord[] = []
const classContext = {
  grade: '고1',
  className: '고1 수학A',
  commonRecords: commonRows,
}

function sourceParams(selectedDate: string, historical: boolean) {
  return {
    studentId,
    selectedDate,
    progressRecords: progressRows,
    homeworkTextbookEntries: homeworkRows,
    attendance: attendanceRows,
    dailyTests: dailyTestRows,
    todayAssignments,
    classNotes,
    classTodayReportCommon: commonRows,
    grade: '고1',
    className: '고1 수학A',
    historical,
  }
}

assert.equal(findAttendanceOnDate(attendanceRows, studentId, day7)?.status, '출석')
assert.equal(findAttendanceOnDate(attendanceRows, studentId, day6)?.status, '지각')
assert.equal(findAttendanceOnDate(attendanceRows, studentId, today)?.status, '조퇴')
assert.equal(findAttendanceOnDate(attendanceRows, studentId, emptyDay), undefined)

assert.equal(findDailyTestsOnDate(dailyTestRows, studentId, day7)[0]?.memo, '2차시 90점')
assert.equal(findDailyTestsOnDate(dailyTestRows, studentId, day6)[0]?.memo, '1차시 85점')
assert.equal(findDailyTestsOnDate(dailyTestRows, studentId, today)[0]?.memo, '3차시 95점')
assert.equal(findDailyTestsOnDate(dailyTestRows, studentId, emptyDay).length, 0)

const hw7 = buildParentHomeworkTextbookDisplays(
  studentId,
  day7,
  [],
  homeworkRows,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(hw7?.status, '완료')
assert.equal(hw7?.todayAssignment, 'p.38~42')

const hw6 = buildParentHomeworkTextbookDisplays(
  studentId,
  day6,
  [],
  homeworkRows,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(hw6?.status, '미완료')
assert.equal(hw6?.todayAssignment, 'p.44~48')

const hwToday = buildParentHomeworkTextbookDisplays(
  studentId,
  today,
  [],
  homeworkRows,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(hwToday?.status, '부분 완료')
assert.equal(hwToday?.todayAssignment, 'p.76~80')

const prog7 = buildParentProgressTextbookDisplays(
  studentId,
  day7,
  [],
  progressRows,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(prog7?.currentProgress, '집합과 명제 p.32~37')

const prog6 = buildParentProgressTextbookDisplays(
  studentId,
  day6,
  [],
  progressRows,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(prog6?.currentProgress, '집합과 명제 p.38~43')

const emptyHw = buildParentHomeworkTextbookDisplays(
  studentId,
  emptyDay,
  [],
  homeworkRows,
  classContext,
  { historical: true },
)
assert.equal(
  emptyHw.some((item) => item.todayAssignment || item.status),
  false,
)

const emptyProg = buildParentProgressTextbookDisplays(
  studentId,
  emptyDay,
  [],
  progressRows,
  classContext,
  { historical: true },
)
assert.equal(
  emptyProg.some((item) => item.currentProgress.trim()),
  false,
)

const historicalEmpty = resolveParentTodayReportDisplaySource(
  sourceParams(emptyDay, true),
)
assert.equal(historicalEmpty.displayDate, emptyDay)
assert.equal(historicalEmpty.isFallback, false)
assert.equal(
  hasParentTodayReportContentOnDate({
    ...sourceParams(emptyDay, true),
    date: emptyDay,
  }),
  false,
)

const currentCarry = resolveParentTodayReportDisplaySource(sourceParams(emptyDay, false))
assert.equal(currentCarry.isFallback, true)
assert.notEqual(currentCarry.displayDate, emptyDay)

assert.equal(
  findLatestAttendanceForDisplay(attendanceRows, studentId, emptyDay)?.status,
  '지각',
)
assert.equal(findAttendanceOnDate(attendanceRows, studentId, emptyDay), undefined)
assert.equal(
  findLatestDailyTestsForDisplay(dailyTestRows, studentId, emptyDay)[0]?.memo,
  '1차시 85점',
)
assert.equal(findDailyTestsOnDate(dailyTestRows, studentId, emptyDay).length, 0)

const editedDay7 = [
  progress(day7, '집합과 명제 p.32~37 수정'),
  progress(day6, '집합과 명제 p.38~43'),
  progress(today, '집합과 명제 p.70~75'),
]
const editedIndex = findProgressRecordIndexForDate(editedDay7, editedDay7[0])
assert.equal(editedIndex, 0)
const afterEdit = buildParentProgressTextbookDisplays(
  studentId,
  day7,
  [],
  editedDay7,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(afterEdit?.currentProgress, '집합과 명제 p.32~37 수정')
const day6AfterEdit = buildParentProgressTextbookDisplays(
  studentId,
  day6,
  [],
  editedDay7,
  classContext,
  { historical: true },
).find((item) => item.subject === '수학' && item.slotNumber === 1)
assert.equal(day6AfterEdit?.currentProgress, '집합과 명제 p.38~43')

console.log('parent today-report historical lookup tests passed.')
