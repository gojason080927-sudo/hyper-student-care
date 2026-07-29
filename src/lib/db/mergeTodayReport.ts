import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  ProgressRecord,
  TodayAssignmentRecord,
} from '../../types/records'
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

function upsertProgressByStudentDate(prev: ProgressRecord[], incoming: ProgressRecord[]): ProgressRecord[] {
  if (incoming.length === 0) return prev
  const next = [...prev]
  for (const record of incoming) {
    const index = next.findIndex(
      (item) =>
        item.id === record.id ||
        (item.studentId === record.studentId && item.lastStudyDate === record.lastStudyDate),
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
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
  dailyTests: DailyTestRecord[]
}

export function mergeTodayReportIntoState(
  current: TodayReportMergeResult,
  report: TodayReportData,
): TodayReportMergeResult {
  return {
    attendance: report.attendance
      ? upsertByStudentDate(current.attendance, report.attendance)
      : current.attendance,
    progress: upsertProgressByStudentDate(current.progress, report.progress),
    assignmentCompletion: upsertById(current.assignmentCompletion, report.assignmentCompletion),
    homework: report.homework
      ? upsertByStudentDate(current.homework, report.homework)
      : current.homework,
    todayAssignments: report.todayAssignment
      ? upsertByStudentDate(current.todayAssignments, report.todayAssignment)
      : current.todayAssignments,
    classNotes: report.classNote
      ? upsertByStudentDate(current.classNotes, report.classNote)
      : current.classNotes,
    dailyTests: report.dailyTest
      ? upsertByStudentDate(current.dailyTests, report.dailyTest)
      : current.dailyTests,
  }
}
