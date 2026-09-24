import type { TextbookSubject } from '../types/records'
import { CLASS_DAYS, type ClassDay } from './subjectClassDays'
import { getSeoulDateString } from './seoulDate'
import { getVisibleTextbookSubjects } from './studentGradeClass'

/** Today Report 실운영 시작일. 이전 legacy/test 행은 삭제하지 않고 이전 수업 탐색에서만 제외한다. */
export const TODAY_REPORT_OPERATION_START = '2026-09-07'

const WEEKDAY_CHAR = /^[월화수목금토일]/

function operationMinDate(minDate?: string): string {
  if (!minDate || minDate < TODAY_REPORT_OPERATION_START) return TODAY_REPORT_OPERATION_START
  return minDate
}

export function seoulClassDay(date: string): ClassDay | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const label = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00+09:00`))
  const day = label.replace('요일', '').trim()
  const char = WEEKDAY_CHAR.exec(day)?.[0] ?? ''
  return (CLASS_DAYS as readonly string[]).includes(char) ? (char as ClassDay) : null
}

/** 같은 요일이 양쪽이거나 둘 다 아니면 추측하지 않는다. */
export function scheduledSubjectOnDate(
  date: string,
  mathClassDays: readonly string[] | null | undefined,
  englishClassDays: readonly string[] | null | undefined,
): TextbookSubject | null {
  const day = seoulClassDay(date)
  if (!day) return null
  const math = (mathClassDays ?? []).includes(day)
  const english = (englishClassDays ?? []).includes(day)
  if (math && !english) return '수학'
  if (english && !math) return '영어'
  return null
}

/**
 * 1. 그 날짜에 과목 행이 정확히 하나면 그 과목.
 * 2. 없으면 등록 요일.
 * 3. 요일이 없거나 양쪽/해당 없음이면 null. 추측하지 않는다.
 * 같은 날짜에 두 과목 행이 있으면 null 이고, 호출부가 둘 다 열 수 있게 둔다.
 */
export function resolveAutoSubject(input: {
  visible: readonly TextbookSubject[]
  recorded: readonly TextbookSubject[]
  scheduled: TextbookSubject | null
}): TextbookSubject | null {
  const visible = new Set(input.visible)
  const recorded = [...new Set(input.recorded.filter((subject) => visible.has(subject)))]
  if (recorded.length === 1) return recorded[0]
  if (recorded.length > 1) return null
  if (input.scheduled && visible.has(input.scheduled)) return input.scheduled
  return null
}

/**
 * 화면에 보여줄 과목. 수강 과목이 하나여도 오늘 수업으로 단정하지 않는다.
 * 수동 선택 → 오늘 실제 과목 → 수강 과목이 하나일 때만 그 과목.
 */
export function viewSubjectForReport(input: {
  visible: readonly TextbookSubject[]
  manual: TextbookSubject | null
  actualToday: TextbookSubject | null
}): TextbookSubject | null {
  if (input.manual && input.visible.includes(input.manual)) return input.manual
  if (input.actualToday && input.visible.includes(input.actualToday)) return input.actualToday
  if (input.visible.length === 1) return input.visible[0]
  return null
}

/** 오늘 날짜를 보고 있고, 그 과목이 실제 오늘 수업일 때만 true. */
export function isActualTodayClass(input: {
  viewingToday: boolean
  pastOpen: boolean
  actualToday: TextbookSubject | null
  viewSubject: TextbookSubject | null
}): boolean {
  return (
    input.viewingToday &&
    !input.pastOpen &&
    input.actualToday != null &&
    input.viewSubject === input.actualToday
  )
}

export function latestSubjectReportDate(
  dates: readonly string[],
  limitDate: string,
  minDate?: string,
): string | null {
  const min = operationMinDate(minDate)
  const sorted = [...new Set(dates)]
    .filter((date) => date <= limitDate && date >= min)
    .sort((a, b) => b.localeCompare(a))
  return sorted[0] ?? null
}

export function subjectReportDatesOnOrBefore(
  dates: readonly string[],
  limitDate: string,
  minDate?: string,
): string[] {
  const min = operationMinDate(minDate)
  return [...new Set(dates)]
    .filter((date) => date <= limitDate && date >= min)
    .sort((a, b) => b.localeCompare(a))
}

export function isSubjectBearing(subject: string): subject is TextbookSubject {
  return subject === '수학' || subject === '영어'
}

export function todaySeoul(): string {
  return getSeoulDateString()
}

/** 반 화면은 학생 subjects의 합집합. 비어 있으면 반 이름 기준. */
export function visibleSubjectsForClass(
  className: string,
  students: readonly { className: string; subjects?: readonly string[] }[],
): TextbookSubject[] {
  const found = new Set<TextbookSubject>()
  for (const student of students) {
    for (const subject of getVisibleTextbookSubjects(student.className || className, student.subjects)) {
      found.add(subject)
    }
  }
  if (found.size === 0) return getVisibleTextbookSubjects(className)
  return (['수학', '영어'] as const).filter((subject) => found.has(subject))
}

type DatedSubject = { date: string; subject: string }

export function recordedSubjectsOnDate(
  rows: readonly DatedSubject[],
  date: string,
): TextbookSubject[] {
  const found = new Set<TextbookSubject>()
  for (const row of rows) {
    if (row.date === date && isSubjectBearing(row.subject)) found.add(row.subject)
  }
  return [...found]
}

function hasProgressBody(record: {
  currentProgress?: string
  currentPage?: number
  totalPage?: number
  teacherMemo?: string
}): boolean {
  return Boolean(
    record.currentProgress?.trim() ||
      (record.currentPage ?? 0) > 0 ||
      (record.totalPage ?? 0) > 0 ||
      record.teacherMemo?.trim(),
  )
}

/**
 * 이전 수업 날짜는 선택 과목의 실제 수업 내용이 있는 행만 사용한다.
 * 출결·교재 준비·태도·강사 피드백·교재명만 있는 행은 포함하지 않는다.
 * 정규 수업요일로 날짜를 만들지 않는다.
 */
export function collectSubjectReportRows(input: {
  studentIds: ReadonlySet<string>
  grade: string
  className: string
  dailyTests: readonly { studentId: string; date: string; subject: string }[]
  homeworkTextbookEntries: readonly {
    studentId: string
    date: string
    subject: string
    status?: string
    todayAssignment?: string
    previousAssignment?: string
  }[]
  progressRecords: readonly {
    studentId: string
    lastStudyDate: string
    subject: string
    currentProgress?: string
    currentPage?: number
    totalPage?: number
    teacherMemo?: string
  }[]
  classTodayReportCommon: readonly {
    grade: string
    className: string
    reportDate: string
    subject: string
    todayAssignment?: string
    previousAssignment?: string
    currentProgress?: string
    currentPage?: number
    totalPage?: number
    textbookName?: string
  }[]
}): { date: string; subject: string }[] {
  const rows: { date: string; subject: string }[] = []
  const grade = input.grade.trim()
  const className = input.className.trim()

  for (const record of input.dailyTests) {
    if (!input.studentIds.has(record.studentId) || !isSubjectBearing(record.subject)) continue
    rows.push({ date: record.date, subject: record.subject })
  }
  for (const entry of input.homeworkTextbookEntries) {
    if (!input.studentIds.has(entry.studentId) || !isSubjectBearing(entry.subject)) continue
    const hasHomework =
      Boolean(entry.status?.trim()) ||
      Boolean(entry.todayAssignment?.trim()) ||
      Boolean(entry.previousAssignment?.trim())
    if (!hasHomework) continue
    rows.push({ date: entry.date, subject: entry.subject })
  }
  for (const record of input.progressRecords) {
    if (!input.studentIds.has(record.studentId) || !isSubjectBearing(record.subject)) continue
    if (!hasProgressBody(record)) continue
    rows.push({ date: record.lastStudyDate, subject: record.subject })
  }
  for (const record of input.classTodayReportCommon) {
    if (record.grade !== grade || record.className !== className) continue
    if (!isSubjectBearing(record.subject)) continue
    const hasClassContent =
      Boolean(record.todayAssignment?.trim()) ||
      Boolean(record.previousAssignment?.trim()) ||
      Boolean(record.currentProgress?.trim()) ||
      (record.currentPage ?? 0) > 0 ||
      (record.totalPage ?? 0) > 0
    if (!hasClassContent) continue
    rows.push({ date: record.reportDate, subject: record.subject })
  }
  return rows
}

export function datesForSubject(
  rows: readonly DatedSubject[],
  subject: TextbookSubject,
): string[] {
  const dates = new Set<string>()
  for (const row of rows) {
    if (row.subject === subject && row.date) dates.add(row.date)
  }
  return [...dates]
}

export function agreedScheduledSubject(
  students: readonly {
    mathClassDays?: readonly string[] | null
    englishClassDays?: readonly string[] | null
  }[],
  date: string,
): TextbookSubject | null {
  const votes = new Set<TextbookSubject>()
  let considered = false
  for (const student of students) {
    const hasDays = (student.mathClassDays?.length ?? 0) > 0 || (student.englishClassDays?.length ?? 0) > 0
    if (!hasDays) continue
    considered = true
    const subject = scheduledSubjectOnDate(date, student.mathClassDays, student.englishClassDays)
    if (!subject) return null
    votes.add(subject)
  }
  if (!considered || votes.size !== 1) return null
  return [...votes][0]
}
