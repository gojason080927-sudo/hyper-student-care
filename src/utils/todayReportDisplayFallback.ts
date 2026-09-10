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
import {
  findClassTodayReportCommon,
  findClassTodayReportCommonForSubject,
} from './classTodayReportCommon'
import { hasDailyTestDisplayData } from './dailyTest'
import { isHomeworkStatusSelected } from './homework'
import { classNamesForClassCommonLookup } from './mathSharedGroup'

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

/** True when class-common row has usable 오늘의 진도 fields. */
export function hasClassCommonProgressContent(
  record: ClassTodayReportCommon | undefined,
): boolean {
  if (!record) return false
  return (
    record.currentProgress.trim().length > 0 ||
    record.currentPage > 0 ||
    record.totalPage > 0
  )
}

/**
 * Progress-only display lookup.
 * Exact-date rows that only exist for homework (empty progress fields) must NOT
 * block carry-forward of the last saved 진도.
 * Intentional empty tombstones (exact date, empty progress, no prior content to
 * show) still render empty.
 */
export function findClassTodayReportCommonForProgressDisplay(
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
  if (exact && hasClassCommonProgressContent(exact)) {
    return { record: exact, isFallback: false }
  }

  const trimmedClass = className.trim()
  const matches = records.filter(
    (record) =>
      record.grade === grade &&
      record.className === trimmedClass &&
      record.subject === subject &&
      record.slotNumber === slotNumber &&
      isOnOrBefore(record.reportDate, reportDate) &&
      hasClassCommonProgressContent(record),
  )
  const latest = pickLatestByDate(matches, (r) => r.reportDate, reportDate)
  if (latest) {
    return {
      record: latest,
      isFallback: latest.reportDate !== reportDate,
    }
  }

  // Sticky empty: exact row exists but no prior progress content to carry.
  if (exact) return { record: exact, isFallback: false }
  return { record: undefined, isFallback: false }
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

/**
 * Parent performance lookup: never let an exact-date row with empty status
 * hide the latest prior 완료/부분완료/미완료.
 * Display-only — do not write to DB / monthly aggregates.
 */
export function findHomeworkPerformanceEntryForDisplay(
  entries: HomeworkTextbookEntry[],
  studentId: string,
  date: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): { entry?: HomeworkTextbookEntry; isFallback: boolean } {
  const sameSlot = entries.filter(
    (entry) =>
      entry.studentId === studentId &&
      entry.subject === subject &&
      entry.slotNumber === slotNumber &&
      isOnOrBefore(entry.date, date),
  )

  const exact = sameSlot.find((entry) => entry.date === date)
  if (exact && isHomeworkStatusSelected(exact.status)) {
    return { entry: exact, isFallback: false }
  }

  const withStatus = sameSlot.filter((entry) => isHomeworkStatusSelected(entry.status))
  const latestStatus = pickLatestByDate(withStatus, (e) => e.date, date)
  if (latestStatus) {
    return {
      entry: latestStatus,
      isFallback: latestStatus.date !== date,
    }
  }

  // No status stored yet — keep content fallback for 지난 과제 text only.
  return findHomeworkTextbookEntryForDisplay(
    entries,
    studentId,
    date,
    subject,
    slotNumber,
  )
}

function hasTodayAssignmentText(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

/**
 * Parent 오늘의 과제 display-only: 오늘 저장된 과제 문구가 있으면 그 값,
 * 없으면 해당 학생/반 슬롯의 가장 최근 과제. DB에 복사하지 않는다.
 */
export function resolveParentTodayAssignmentText(params: {
  entries: HomeworkTextbookEntry[]
  commonRecords: ClassTodayReportCommon[]
  grade: string
  className: string
  studentId: string
  date: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
}): string {
  const {
    entries,
    commonRecords,
    grade,
    className,
    studentId,
    date,
    subject,
    slotNumber,
  } = params

  const exactCommon = findClassTodayReportCommonForSubject(
    commonRecords,
    grade,
    className,
    date,
    subject,
    slotNumber,
  )
  if (hasTodayAssignmentText(exactCommon?.todayAssignment)) {
    return exactCommon!.todayAssignment.trim()
  }

  const exactEntry = entries.find(
    (entry) =>
      entry.studentId === studentId &&
      entry.date === date &&
      entry.subject === subject &&
      entry.slotNumber === slotNumber,
  )
  if (hasTodayAssignmentText(exactEntry?.todayAssignment)) {
    return exactEntry!.todayAssignment.trim()
  }

  const classNames = classNamesForClassCommonLookup(grade, className, subject)
  const names = classNames.length > 0 ? classNames : [className.trim()]
  const commonMatches = commonRecords.filter(
    (record) =>
      record.grade === grade &&
      names.includes(record.className.trim()) &&
      record.subject === subject &&
      record.slotNumber === slotNumber &&
      isOnOrBefore(record.reportDate, date) &&
      hasTodayAssignmentText(record.todayAssignment),
  )
  const latestCommon = pickLatestByDate(commonMatches, (r) => r.reportDate, date)

  const entryMatches = entries.filter(
    (entry) =>
      entry.studentId === studentId &&
      entry.subject === subject &&
      entry.slotNumber === slotNumber &&
      isOnOrBefore(entry.date, date) &&
      hasTodayAssignmentText(entry.todayAssignment),
  )
  const latestEntry = pickLatestByDate(entryMatches, (e) => e.date, date)

  if (latestCommon && latestEntry) {
    if (latestCommon.reportDate >= latestEntry.date) {
      return latestCommon.todayAssignment.trim()
    }
    return latestEntry.todayAssignment.trim()
  }
  return latestCommon?.todayAssignment.trim() || latestEntry?.todayAssignment.trim() || ''
}

/** Parent 출결: 오늘 상태 있으면 오늘, 없으면 해당 학생의 가장 최근 출결. */
export function findLatestAttendanceForDisplay(
  records: AttendanceRecord[],
  studentId: string,
  date: string,
): AttendanceRecord | undefined {
  const exact = records.find(
    (record) =>
      record.studentId === studentId &&
      record.date === date &&
      Boolean(record.status),
  )
  if (exact) return exact

  const matches = records.filter(
    (record) =>
      record.studentId === studentId &&
      Boolean(record.status) &&
      isOnOrBefore(record.date, date),
  )
  return pickLatestByDate(matches, (record) => record.date, date)
}

/** Parent 레거시 today_assignments: 오늘 과제 문구가 있으면 오늘, 없으면 최근. */
export function findLatestTodayAssignmentRecordForDisplay(
  records: TodayAssignmentRecord[],
  studentId: string,
  date: string,
): TodayAssignmentRecord | undefined {
  const hasContent = (record: TodayAssignmentRecord) =>
    Boolean(record.assignment1.trim() || record.assignment2.trim())

  const exact = records.find(
    (record) => record.studentId === studentId && record.date === date && hasContent(record),
  )
  if (exact) return exact

  const matches = records.filter(
    (record) =>
      record.studentId === studentId &&
      hasContent(record) &&
      isOnOrBefore(record.date, date),
  )
  return pickLatestByDate(matches, (record) => record.date, date)
}

/**
 * Parent 일일테스트: 오늘 응시/기록이 있으면 오늘 것만,
 * 없으면 가장 최근 날짜의 해당 학생 테스트 전부.
 */
export function findLatestDailyTestsForDisplay(
  records: DailyTestRecord[],
  studentId: string,
  date: string,
): DailyTestRecord[] {
  const sortBySubject = (items: DailyTestRecord[]) =>
    [...items].sort((a, b) => a.subject.localeCompare(b.subject, 'ko'))

  const todays = records.filter(
    (record) =>
      record.studentId === studentId &&
      record.date === date &&
      hasDailyTestDisplayData(record),
  )
  if (todays.length > 0) return sortBySubject(todays)

  const prior = records.filter(
    (record) =>
      record.studentId === studentId &&
      isOnOrBefore(record.date, date) &&
      hasDailyTestDisplayData(record),
  )
  const latest = pickLatestByDate(prior, (record) => record.date, date)
  if (!latest) return []
  return sortBySubject(prior.filter((record) => record.date === latest.date))
}

/** Past homework text for parent: prefer previousAssignment; if carrying a prior day, use that day's todayAssignment. */
export function resolveParentPreviousAssignmentDisplay(
  entry: HomeworkTextbookEntry | undefined,
  isFallback: boolean,
): string {
  if (!entry) return ''
  const previous = entry.previousAssignment.trim()
  if (previous) return previous
  if (isFallback) return entry.todayAssignment.trim()
  return ''
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
  // Exact-date row wins (including intentional empty tombstone after clear+save).
  if (exact) return { record: exact, isFallback: false }

  const matches = records.filter(
    (record) =>
      record.studentId === studentId &&
      record.subject === subject &&
      (record.slotNumber ?? 1) === slotNumber &&
      isOnOrBefore(record.lastStudyDate, date) &&
      (record.currentProgress.trim() ||
        record.currentPage > 0 ||
        record.totalPage > 0),
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

export function hasParentTodayReportContentOnDate(params: {
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

/** Exact-date attendance. Historical view must not carry another day's status. */
export function findAttendanceOnDate(
  records: AttendanceRecord[],
  studentId: string,
  date: string,
): AttendanceRecord | undefined {
  return records.find(
    (record) =>
      record.studentId === studentId &&
      record.date === date &&
      Boolean(record.status),
  )
}

/** Exact-date daily tests only. */
export function findDailyTestsOnDate(
  records: DailyTestRecord[],
  studentId: string,
  date: string,
): DailyTestRecord[] {
  return records
    .filter(
      (record) =>
        record.studentId === studentId &&
        record.date === date &&
        hasDailyTestDisplayData(record),
    )
    .sort((a, b) => a.subject.localeCompare(b.subject, 'ko'))
}

/** Exact-date legacy today_assignments row. */
export function findTodayAssignmentOnDate(
  records: TodayAssignmentRecord[],
  studentId: string,
  date: string,
): TodayAssignmentRecord | undefined {
  return records.find(
    (record) =>
      record.studentId === studentId &&
      record.date === date &&
      Boolean(record.assignment1.trim() || record.assignment2.trim()),
  )
}

/**
 * Resolve which date's actual records to show for parent read-only Today Report.
 * Historical view (past date explicitly selected) must stay on that date.
 */
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
  /** Past-date history: never substitute another day's snapshot. */
  historical?: boolean
}): ParentTodayReportSource {
  if (params.historical) {
    return { displayDate: params.selectedDate, isFallback: false }
  }

  if (
    hasParentTodayReportContentOnDate({
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
