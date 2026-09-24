import type { TextbookSubject } from '../types/records'
import { CLASS_DAYS, type ClassDay } from './subjectClassDays'
import { getSeoulDateString } from './seoulDate'
import { getVisibleTextbookSubjects } from './studentGradeClass'

const WEEKDAY_CHAR = /^[월화수목금토일]/

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

export function latestSubjectReportDate(
  dates: readonly string[],
  limitDate: string,
  minDate?: string,
): string | null {
  const sorted = [...new Set(dates)]
    .filter((date) => date <= limitDate && (!minDate || date >= minDate))
    .sort((a, b) => b.localeCompare(a))
  return sorted[0] ?? null
}

export function subjectReportDatesOnOrBefore(
  dates: readonly string[],
  limitDate: string,
  minDate?: string,
): string[] {
  return [...new Set(dates)]
    .filter((date) => date <= limitDate && (!minDate || date >= minDate))
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
