import { hasDailyTestDisplayData } from './dailyTest'
import { getHomeworkContent } from './homework'
import { buildHomeworkTextbookDisplays, buildProgressTextbookDisplays } from './textbookSlots'
import type { StudentDayRecords } from './todayReportLookup'

export type TodayReportCompletionStatus = 'empty' | 'partial' | 'complete'

const STATUS_LABELS: Record<TodayReportCompletionStatus, string> = {
  empty: '미입력',
  partial: '일부 입력',
  complete: '입력 완료',
}

const STATUS_COLORS: Record<TodayReportCompletionStatus, string> = {
  empty: 'bg-slate-100 text-slate-600',
  partial: 'bg-amber-100 text-amber-800',
  complete: 'bg-emerald-100 text-emerald-800',
}

function hasHomeworkInput(records: StudentDayRecords, studentId: string, date: string): boolean {
  const slotDisplays = buildHomeworkTextbookDisplays(
    studentId,
    date,
    records.studentTextbookSlots ?? [],
    records.homeworkTextbookEntries ?? [],
    records.homework,
    records.todayAssignment,
  )
  if (slotDisplays.length > 0) return true

  return Boolean(
    records.homework?.status ||
      (records.homework && getHomeworkContent(records.homework).trim()) ||
      records.todayAssignment?.assignment1?.trim() ||
      records.todayAssignment?.assignment2?.trim(),
  )
}

function hasProgressInput(records: StudentDayRecords, studentId: string, date: string): boolean {
  const displays = buildProgressTextbookDisplays(
    studentId,
    date,
    records.studentTextbookSlots ?? [],
    records.dayProgress ?? [],
  )
  if (displays.length > 0) return true
  return Boolean(records.progressMath || records.progressEnglish)
}

export function getTodayReportCompletionStatus(
  records: StudentDayRecords,
  studentId?: string,
  date?: string,
): TodayReportCompletionStatus {
  const resolvedStudentId = studentId ?? records.homework?.studentId ?? records.attendance?.studentId ?? ''
  const resolvedDate =
    date ?? records.homework?.date ?? records.attendance?.date ?? records.todayAssignment?.date ?? ''

  const hasAttendance = Boolean(records.attendance?.status)
  const hasHomework = resolvedStudentId
    ? hasHomeworkInput(records, resolvedStudentId, resolvedDate)
    : Boolean(records.homework?.status)
  const hasProgress = resolvedStudentId
    ? hasProgressInput(records, resolvedStudentId, resolvedDate)
    : Boolean(records.progressMath || records.progressEnglish)
  const hasDailyTest = Boolean(
    records.dailyTest && hasDailyTestDisplayData(records.dailyTest),
  )
  const hasClassNote = records.classNote !== undefined

  const filledCount = [hasAttendance, hasHomework, hasProgress, hasDailyTest, hasClassNote].filter(
    Boolean,
  ).length

  if (filledCount === 0) return 'empty'
  if (filledCount === 5) return 'complete'
  return 'partial'
}

export function getTodayReportCompletionLabel(status: TodayReportCompletionStatus): string {
  return STATUS_LABELS[status]
}

export function getTodayReportCompletionColor(status: TodayReportCompletionStatus): string {
  return STATUS_COLORS[status]
}
