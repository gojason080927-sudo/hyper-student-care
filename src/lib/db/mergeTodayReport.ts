import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  StudentTextbookSlot,
  TodayAssignmentRecord,
} from '../../types/records'
import { findProgressRecordIndex } from '../../utils/progressRecord'
import { slotKey } from '../../utils/textbookSlots'
import type { TodayReportData } from '../dataLoader'

function upsertById<T extends { id: string }>(prev: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return prev
  const next = [...prev]
  for (const record of incoming) {
    const index = next.findIndex((item) => item.id === record.id)
    if (index >= 0) next[index] = record
    else next.push(record)
  }
  return next
}

function removeByStudentDate<T extends { studentId: string; date: string }>(
  prev: T[],
  studentId: string,
  date: string,
): T[] {
  return prev.filter((item) => !(item.studentId === studentId && item.date === date))
}

function removeProgressByStudentStudyDate(
  prev: ProgressRecord[],
  studentId: string,
  date: string,
): ProgressRecord[] {
  return prev.filter(
    (item) => !(item.studentId === studentId && item.lastStudyDate === date),
  )
}

function setOptionalByStudentDate<T extends { id: string; studentId: string; date: string }>(
  prev: T[],
  studentId: string,
  date: string,
  incoming: T | null,
): T[] {
  const base = removeByStudentDate(prev, studentId, date)
  return incoming ? [...base, incoming] : base
}

function upsertProgressByStudentSubject(
  prev: ProgressRecord[],
  incoming: ProgressRecord[],
): ProgressRecord[] {
  if (incoming.length === 0) return prev
  const next = [...prev]
  for (const record of incoming) {
    const index = findProgressRecordIndex(next, record)
    if (index >= 0) next[index] = record
    else next.push(record)
  }
  return next
}

function upsertStudentTextbookSlots(
  prev: StudentTextbookSlot[],
  incoming: StudentTextbookSlot[],
): StudentTextbookSlot[] {
  if (incoming.length === 0) return prev
  const next = [...prev]
  for (const record of incoming) {
    const index = next.findIndex(
      (item) =>
        slotKey(item.studentId, item.subject, item.slotNumber) ===
        slotKey(record.studentId, record.subject, record.slotNumber),
    )
    if (index >= 0) next[index] = record
    else next.push(record)
  }
  return next
}

export type TodayReportMergeResult = {
  attendance: AttendanceRecord[]
  progress: ProgressRecord[]
  assignmentCompletion: AssignmentCompletionRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  studentTextbookSlots: StudentTextbookSlot[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
  dailyTests: DailyTestRecord[]
}

export type TodayReportMergeScope = {
  studentId: string
  date: string
}

export function mergeTodayReportIntoState(
  current: TodayReportMergeResult,
  report: TodayReportData,
  scope?: TodayReportMergeScope,
): TodayReportMergeResult {
  if (scope) {
    const { studentId, date } = scope
    return {
      attendance: setOptionalByStudentDate(
        current.attendance,
        studentId,
        date,
        report.attendance,
      ),
      progress: [
        ...removeProgressByStudentStudyDate(current.progress, studentId, date),
        ...report.progress,
      ],
      assignmentCompletion: upsertById(current.assignmentCompletion, report.assignmentCompletion),
      homework: setOptionalByStudentDate(current.homework, studentId, date, report.homework),
      homeworkTextbookEntries:
        report.homeworkTextbookEntries !== undefined
          ? [
              ...removeByStudentDate(current.homeworkTextbookEntries, studentId, date),
              ...report.homeworkTextbookEntries,
            ]
          : current.homeworkTextbookEntries,
      studentTextbookSlots:
        report.studentTextbookSlots !== undefined
          ? upsertStudentTextbookSlots(current.studentTextbookSlots, report.studentTextbookSlots)
          : current.studentTextbookSlots,
      todayAssignments: setOptionalByStudentDate(
        current.todayAssignments,
        studentId,
        date,
        report.todayAssignment,
      ),
      classNotes: setOptionalByStudentDate(current.classNotes, studentId, date, report.classNote),
      dailyTests: (() => {
        const incoming =
          report.dailyTests && report.dailyTests.length > 0
            ? report.dailyTests
            : report.dailyTest
              ? [report.dailyTest]
              : []
        return [
          ...removeByStudentDate(current.dailyTests, studentId, date),
          ...incoming,
        ]
      })(),
    }
  }

  return {
    attendance: report.attendance
      ? upsertByStudentDateLegacy(current.attendance, report.attendance)
      : current.attendance,
    progress: upsertProgressByStudentSubject(current.progress, report.progress),
    assignmentCompletion: upsertById(current.assignmentCompletion, report.assignmentCompletion),
    homework: report.homework
      ? upsertByStudentDateLegacy(current.homework, report.homework)
      : current.homework,
    homeworkTextbookEntries:
      report.homeworkTextbookEntries !== undefined
        ? upsertById(current.homeworkTextbookEntries, report.homeworkTextbookEntries)
        : current.homeworkTextbookEntries,
    studentTextbookSlots:
      report.studentTextbookSlots !== undefined
        ? upsertStudentTextbookSlots(current.studentTextbookSlots, report.studentTextbookSlots)
        : current.studentTextbookSlots,
    todayAssignments: report.todayAssignment
      ? upsertByStudentDateLegacy(current.todayAssignments, report.todayAssignment)
      : current.todayAssignments,
    classNotes: report.classNote
      ? upsertByStudentDateLegacy(current.classNotes, report.classNote)
      : current.classNotes,
    dailyTests: (() => {
      const incoming =
        report.dailyTests && report.dailyTests.length > 0
          ? report.dailyTests
          : report.dailyTest
            ? [report.dailyTest]
            : []
      if (incoming.length === 0) return current.dailyTests
      let next = current.dailyTests
      for (const record of incoming) {
        next = upsertByStudentDateAndSubject(next, record)
      }
      return next
    })(),
  }
}

function upsertByStudentDateAndSubject(
  prev: DailyTestRecord[],
  incoming: DailyTestRecord,
): DailyTestRecord[] {
  const next = prev.filter(
    (item) =>
      !(
        item.studentId === incoming.studentId &&
        item.date === incoming.date &&
        item.subject === incoming.subject
      ),
  )
  return [...next, incoming]
}

function upsertByStudentDate<T extends { id: string; studentId: string; date: string }>(
  prev: T[],
  incoming: T | null,
): T[] {
  if (!incoming) return prev
  const next = prev.filter(
    (item) => !(item.studentId === incoming.studentId && item.date === incoming.date),
  )
  return [...next, incoming]
}

function upsertByStudentDateLegacy<T extends { id: string; studentId: string; date: string }>(
  prev: T[],
  incoming: T,
): T[] {
  return upsertByStudentDate(prev, incoming)
}

