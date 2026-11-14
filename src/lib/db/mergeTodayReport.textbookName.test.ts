/**
 * 날짜별 Today Report 병합이 더 최신 student_textbook_slots를 덮어쓰지 않는지
 * npx vite-node src/lib/db/mergeTodayReport.textbookName.test.ts
 */
import assert from 'node:assert/strict'
import { mergeTodayReportIntoState } from './mergeTodayReport'
import type { StudentTextbookSlot } from '../../types/records'

const older: StudentTextbookSlot = {
  id: 'slot-1',
  studentId: 'stu-a',
  subject: '수학',
  slotNumber: 1,
  textbookName: '일품',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T10:00:00.000Z',
}

const staleIncoming: StudentTextbookSlot = {
  ...older,
  textbookName: '블랙라벨',
  updatedAt: '2026-08-24T10:00:00.000Z',
}

const empty = {
  attendance: [],
  progress: [],
  assignmentCompletion: [],
  homework: [],
  homeworkTextbookEntries: [],
  studentTextbookSlots: [older],
  todayAssignments: [],
  classNotes: [],
  dailyTests: [],
}

const merged = mergeTodayReportIntoState(
  empty,
  {
    attendance: null,
    progress: [],
    assignmentCompletion: [],
    homework: null,
    homeworkTextbookEntries: [],
    studentTextbookSlots: [staleIncoming],
    todayAssignment: null,
    classNote: null,
    dailyTest: null,
    dailyTests: [],
  },
  { studentId: 'stu-a', date: '2026-08-25' },
)

assert.equal(merged.studentTextbookSlots[0]?.textbookName, '일품')

const dupIncomingOlder: StudentTextbookSlot = {
  id: 'slot-homework',
  studentId: 'stu-a',
  subject: '수학',
  slotNumber: 1,
  textbookName: '블랙라벨',
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T10:00:00.000Z',
}
const dupIncomingNewer: StudentTextbookSlot = {
  id: 'slot-progress',
  studentId: 'stu-a',
  subject: '수학',
  slotNumber: 1,
  textbookName: '일품',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T12:00:00.000Z',
}
const mergedDup = mergeTodayReportIntoState(
  { ...empty, studentTextbookSlots: [dupIncomingOlder] },
  {
    attendance: null,
    progress: [],
    assignmentCompletion: [],
    homework: null,
    homeworkTextbookEntries: [],
    studentTextbookSlots: [dupIncomingOlder, dupIncomingNewer],
    todayAssignment: null,
    classNote: null,
    dailyTest: null,
    dailyTests: [],
  },
  { studentId: 'stu-a', date: '2026-08-25' },
)
assert.equal(mergedDup.studentTextbookSlots.length, 1)
assert.equal(mergedDup.studentTextbookSlots[0]?.textbookName, '일품')

console.log('mergeTodayReport textbook name stale-overwrite guard passed.')
