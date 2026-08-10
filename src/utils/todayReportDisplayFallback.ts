/**
 * Display-only helpers for Today Report carry-forward.
 * Never write these fallbacks to DB. Monthly diagnosis must use actual dated records only.
 */
import type {
  AttendanceRecord,
  ClassNoteRecord,
  ClassTodayReportCommon,
  DailyTestRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  TextbookSlotNumber,
  TextbookSubject,
  TodayAssignmentRecord,
} from '../types/records'
import { findClassTodayReportCommon } from './classTodayReportCommon'

function isOnOrBefore(candidate: string, limitDate: string): boolean {
  return candidate <= limitDate
}

function pickLatestByDate<T>(
  items: T[],
  getDate: (item: T) => string,
  limitDate: string,
): T | undefined {
  let best: T | undefined
  let bestDate = ''
  for (const item of items) {
    const d = getDate(item)
    if (!d || !isOnOrBefore(d, limitDate)) continue
    if (!best || d > bestDate) {
      best = item
      bestDate = d
    }
  }
  return best
}

export function findLatestClassTodayReportCommonOnOrBefore(
  records: ClassTodayReportCommon[],
  grade: string,
  className: string,
  limitDate: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): ClassTodayReportCommon | undefined {
  const exact = findClassTodayReportCommon(
    records,
    grade,
    className,
    limitDate,
    subject,
    slotNumber,
  )
  if (exact) return exact

  const trimmedClass = className.trim()
  const matches = records.filter(
    (record) =>
      record.grade === grade &&
      record.className === trimmedClass &&
      record.subject === subject &&
      record.slotNumber === slotNumber &&
      isOnOrBefore(record.reportDate, limitDate) &&
      (record.currentProgress.trim() ||
        record.todayAssignment.trim() ||
        record.previousAssignment.trim() ||
        record.currentPage > 0 ||
        record.totalPage > 0),
  )
  return pickLatestByDate(matches, (r) => r.reportDate, limitDate)
}

/** Exact-date common first; otherwise latest prior content for display only. */
export function findClassTodayReportCommonForDisplay(
  records: ClassTodayReportCommon[],
  grade: string,
  className: string,
  reportDate: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): { record?: ClassTodayReportCommon; isFallback: boolean } {
  const exact = findClassTodayReportCommon(
    records,
    grade,
    className,
    reportDate,
    subject,
    slotNumber,
  )
  if (exact) return { record: exact, isFallback: false }
  const latest = findLatestClassTodayReportCommonOnOrBefore(
    records,
    grade,
    className,
    reportDate,
    subject,
    slotNumber,
  )
  if (!latest) return { record: undefined, isFallback: false }
  return { record: latest, isFallback: latest.reportDate !== reportDate }
}

export function findHomeworkTextbookEntryForDisplay(
  entries: HomeworkTextbookEntry[],
  studentId: string,
  date: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): { entry?: HomeworkTextbookEntry; isFallback: boolean } {
  const exact = entries.find(
    (entry) =>
      entry.studentId === studentId &&
      entry.date === date &&
      entry.subject === subject &&
      entry.slotNumber === slotNumber,
  )
  if (exact) return { entry: exact, isFallback: false }

  const matches = entries.filter(
    (entry) =>
      entry.studentId === studentId &&
      entry.subject === subject &&
      entry.slotNumber === slotNumber &&
      isOnOrBefore(entry.date, date) &&
      (entry.todayAssignment.trim() ||
        entry.previousAssignment.trim() ||
        Boolean(entry.status)),
  )
  const latest = pickLatestByDate(matches, (e) => e.date, date)
  if (!latest) return { entry: undefined, isFallback: false }
  return { entry: latest, isFallback: true }
}

export function findProgressRecordForDisplay(
  records: ProgressRecord[],
  studentId: string,
  date: string,
  subject: string,
  slotNumber: TextbookSlotNumber,
): { record?: ProgressRecord; isFallback: boolean } {
  const exact = records.find(
    (record) =>
      record.studentId === studentId &&
      record.lastStudyDate === date &&
      record.subject === subject &&
      (record.slotNumber ?? 1) === slotNumber,
  )
  if (exact) return { record: exact, isFallback: false }

  const matches = records.filter(
    (record) =>
      record.studentId === studentId &&
      record.subject === subject &&
      (record.slotNumber ?? 1) === slotNumber &&
      isOnOrBefore(record.lastStudyDate, date) &&
      (record.currentProgress.trim() ||
        record.currentPage > 0 ||
        record.totalPage > 0 ||
        record.textbookName.trim()),
  )
  const latest = pickLatestByDate(matches, (r) => r.lastStudyDate, date)
  if (!latest) return { record: undefined, isFallback: false }
  return { record: latest, isFallback: true }
}

export type ParentTodayReportSource = {
  /** Date whose actual records are shown (may differ from selected calendar date). */
  displayDate: string
  /** True when selected date has no own content and an earlier day is shown. */
  isFallback: boolean
}

function studentHasReportContentOnDate(params: {
  studentId: string
  date: string
  progressRecords: ProgressRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  attendance: AttendanceRecord[]
  dailyTests: DailyTestRecord[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
  classTodayReportCommon: ClassTodayReportCommon[]
  grade: string
  className: string
}): boolean {
  const { studentId, date } = params
  if (
    params.progressRecords.some(
      (r) => r.studentId === studentId && r.lastStudyDate === date,
    )
  ) {
    return true
  }
  if (
    params.homeworkTextbookEntries.some(
      (e) => e.studentId === studentId && e.date === date,
    )
  ) {
    return true
  }
  if (
    params.attendance.some((r) => r.studentId === studentId && r.date === date)
  ) {
    return true
  }
  if (
    params.dailyTests.some((r) => r.studentId === studentId && r.date === date)
  ) {
    return true
  }
  if (
    params.todayAssignments.some(
      (r) => r.studentId === studentId && r.date === date,
    )
  ) {
    return true
  }
  if (
    params.classNotes.some((r) => r.studentId === studentId && r.date === date)
  ) {
    return true
  }
  if (
    params.grade &&
    params.className &&
    params.classTodayReportCommon.some(
      (r) =>
        r.grade === params.grade &&
        r.className === params.className &&
        r.reportDate === date &&
        (r.currentProgress.trim() ||
          r.todayAssignment.trim() ||
          r.previousAssignment.trim() ||
          r.currentPage > 0 ||
          r.totalPage > 0),
    )
  ) {
    return true
  }
  return false
}

/** Resolve which date's actual records to show for parent read-only Today Report. */
export function resolveParentTodayReportDisplaySource(params: {
  studentId: string
  selectedDate: string
  progressRecords: ProgressRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  attendance: AttendanceRecord[]
  dailyTests: DailyTestRecord[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
  classTodayReportCommon: ClassTodayReportCommon[]
  grade: string
  className: string
}): ParentTodayReportSource {
  if (
    studentHasReportContentOnDate({
      ...params,
      date: params.selectedDate,
    })
  ) {
    return { displayDate: params.selectedDate, isFallback: false }
  }

  const dates = new Set<string>()
  const { studentId, selectedDate } = params
  for (const r of params.progressRecords) {
    if (r.studentId === studentId && isOnOrBefore(r.lastStudyDate, selectedDate)) {
      dates.add(r.lastStudyDate)
    }
  }
  for (const e of params.homeworkTextbookEntries) {
    if (e.studentId === studentId && isOnOrBefore(e.date, selectedDate)) {
      dates.add(e.date)
    }
  }
  for (const r of params.attendance) {
    if (r.studentId === studentId && isOnOrBefore(r.date, selectedDate)) {
      dates.add(r.date)
    }
  }
  for (const r of params.dailyTests) {
    if (r.studentId === studentId && isOnOrBefore(r.date, selectedDate)) {
      dates.add(r.date)
    }
  }
  for (const r of params.todayAssignments) {
    if (r.studentId === studentId && isOnOrBefore(r.date, selectedDate)) {
      dates.add(r.date)
    }
  }
  for (const r of params.classNotes) {
    if (r.studentId === studentId && isOnOrBefore(r.date, selectedDate)) {
      dates.add(r.date)
    }
  }
  if (params.grade && params.className) {
    for (const r of params.classTodayReportCommon) {
      if (
        r.grade === params.grade &&
        r.className === params.className &&
        isOnOrBefore(r.reportDate, selectedDate)
      ) {
        dates.add(r.reportDate)
      }
    }
  }

  const sorted = [...dates].sort((a, b) => b.localeCompare(a))
  const latest = sorted[0]
  if (!latest) {
    return { displayDate: selectedDate, isFallback: false }
  }
  return { displayDate: latest, isFallback: true }
}
