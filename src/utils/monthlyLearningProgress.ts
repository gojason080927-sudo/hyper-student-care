import type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
} from '../types/records'
import { classifyHomeworkStatus } from './homework'
import { getFinalPassSession, migrateSessionResults } from './dailyTest'
import { getSeoulDateString } from './seoulDate'

/** 표시·점수 계산 공통 집계 객체 */
export type MonthlyLearningCounts = {
  lateCount: number
  absentCount: number
  partialHomeworkCount: number
  incompleteHomeworkCount: number
  testPass2Count: number
  testPass3Count: number
  testPass4Count: number
}

export type ComprehensiveGrade = '부족' | '양호' | '우수' | '매우 우수'

export type MonthlyLearningProgress = {
  counts: MonthlyLearningCounts
  deduction: number
  score: number
  grade: ComprehensiveGrade
}

const isDev = Boolean(import.meta.env?.DEV)

export function getSeoulYearMonth(date: Date = new Date()): { year: number; month: number } {
  const [year, month] = getSeoulDateString(date).split('-').map(Number)
  return { year, month }
}

export function isDateInYearMonth(date: string, year: number, month: number): boolean {
  const [y, m] = date.split('-').map(Number)
  return y === year && m === month
}

function countAttendanceStatus(
  records: AttendanceRecord[],
  studentId: string,
  year: number,
  month: number,
  status: AttendanceRecord['status'],
): number {
  const seenDates = new Set<string>()
  let count = 0
  for (const record of records) {
    if (record.studentId !== studentId) continue
    if (!isDateInYearMonth(record.date, year, month)) continue
    if (record.status !== status) continue
    if (seenDates.has(record.date)) continue
    seenDates.add(record.date)
    count++
  }
  return count
}

type HomeworkAggregationSource =
  | { source: 'homework_textbook_entries'; record: HomeworkTextbookEntry }
  | { source: 'homework'; record: HomeworkRecord }

function collectHomeworkSources(
  textbookEntries: HomeworkTextbookEntry[],
  legacyHomework: HomeworkRecord[],
  studentId: string,
  year: number,
  month: number,
): HomeworkAggregationSource[] {
  const sources: HomeworkAggregationSource[] = []
  const seenTextbookKeys = new Set<string>()

  for (const entry of textbookEntries) {
    if (entry.studentId !== studentId) continue
    if (!isDateInYearMonth(entry.date, year, month)) continue

    const dedupeKey = `${entry.date}:${entry.subject}:${entry.slotNumber}`
    if (seenTextbookKeys.has(dedupeKey)) continue
    seenTextbookKeys.add(dedupeKey)

    sources.push({ source: 'homework_textbook_entries', record: entry })
  }

  const datesWithTextbookEntries = new Set<string>()
  for (const entry of textbookEntries) {
    if (entry.studentId !== studentId) continue
    if (!isDateInYearMonth(entry.date, year, month)) continue
    datesWithTextbookEntries.add(entry.date)
  }

  const seenLegacyDates = new Set<string>()
  for (const record of legacyHomework) {
    if (record.studentId !== studentId) continue
    if (!isDateInYearMonth(record.date, year, month)) continue
    if (datesWithTextbookEntries.has(record.date)) continue
    if (seenLegacyDates.has(record.date)) continue
    seenLegacyDates.add(record.date)

    sources.push({ source: 'homework', record })
  }

  return sources
}

function countHomeworkStatuses(
  textbookEntries: HomeworkTextbookEntry[],
  legacyHomework: HomeworkRecord[],
  studentId: string,
  year: number,
  month: number,
): Pick<MonthlyLearningCounts, 'partialHomeworkCount' | 'incompleteHomeworkCount'> {
  const sources = collectHomeworkSources(
    textbookEntries,
    legacyHomework,
    studentId,
    year,
    month,
  )

  let partialHomeworkCount = 0
  let incompleteHomeworkCount = 0

  for (const item of sources) {
    const status =
      item.source === 'homework_textbook_entries' ? item.record.status : item.record.status
    const category = classifyHomeworkStatus(status)
    if (category === 'partial') partialHomeworkCount++
    else if (category === 'incomplete') incompleteHomeworkCount++
  }

  if (isDev) {
    console.log('[MonthlyLearningProgress] homework aggregation', {
      studentId,
      year,
      month,
      rawRecords: sources.map((item) =>
        item.source === 'homework_textbook_entries'
          ? {
              source: item.source,
              studentId: item.record.studentId,
              date: item.record.date,
              subject: item.record.subject,
              slotNumber: item.record.slotNumber,
              status: item.record.status,
            }
          : {
              source: item.source,
              studentId: item.record.studentId,
              date: item.record.date,
              status: item.record.status,
            },
      ),
      partialHomeworkCount,
      incompleteHomeworkCount,
    })
  }

  return { partialHomeworkCount, incompleteHomeworkCount }
}

function countDailyTestFinalPass(
  tests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
  passSession: 2 | 3 | 4,
): number {
  const seenDates = new Set<string>()
  let count = 0
  for (const test of tests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (seenDates.has(test.date)) continue
    seenDates.add(test.date)
    const sessions = migrateSessionResults(test)
    const finalPassSession = getFinalPassSession(sessions)
    if (finalPassSession === passSession) count++
  }
  return count
}

export function aggregateMonthlyLearningCounts(input: {
  studentId: string
  year: number
  month: number
  attendance: AttendanceRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  homework?: HomeworkRecord[]
  dailyTests: DailyTestRecord[]
}): MonthlyLearningCounts {
  const {
    studentId,
    year,
    month,
    attendance,
    homeworkTextbookEntries,
    homework = [],
    dailyTests,
  } = input
  const homeworkCounts = countHomeworkStatuses(
    homeworkTextbookEntries,
    homework,
    studentId,
    year,
    month,
  )

  return {
    lateCount: countAttendanceStatus(attendance, studentId, year, month, '지각'),
    absentCount: countAttendanceStatus(attendance, studentId, year, month, '결석'),
    ...homeworkCounts,
    testPass2Count: countDailyTestFinalPass(dailyTests, studentId, year, month, 2),
    testPass3Count: countDailyTestFinalPass(dailyTests, studentId, year, month, 3),
    testPass4Count: countDailyTestFinalPass(dailyTests, studentId, year, month, 4),
  }
}

export function calculateTotalDeduction(counts: MonthlyLearningCounts): number {
  return (
    counts.lateCount +
    counts.partialHomeworkCount +
    counts.incompleteHomeworkCount * 2 +
    counts.testPass2Count +
    counts.testPass3Count * 2 +
    counts.testPass4Count * 3
  )
}

export function calculateComprehensiveScore(counts: MonthlyLearningCounts): number {
  return Math.max(0, Math.min(100, 100 - calculateTotalDeduction(counts)))
}

export function aggregateMonthlyLearningProgress(input: {
  studentId: string
  year: number
  month: number
  attendance: AttendanceRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  homework?: HomeworkRecord[]
  dailyTests: DailyTestRecord[]
}): MonthlyLearningProgress {
  const counts = aggregateMonthlyLearningCounts(input)
  const deduction = calculateTotalDeduction(counts)
  const score = calculateComprehensiveScore(counts)

  if (isDev) {
    console.log('[MonthlyLearningProgress] final score', {
      studentId: input.studentId,
      year: input.year,
      month: input.month,
      partialHomeworkCount: counts.partialHomeworkCount,
      incompleteHomeworkCount: counts.incompleteHomeworkCount,
      deduction,
      score,
      counts,
    })
  }

  return {
    counts,
    deduction,
    score,
    grade: getComprehensiveGrade(score),
  }
}

export function getComprehensiveGrade(score: number): ComprehensiveGrade {
  if (score >= 90) return '매우 우수'
  if (score >= 80) return '우수'
  if (score >= 70) return '양호'
  return '부족'
}

export const SCORE_DEDUCTION_RULES = [
  { label: '지각', points: 1, applies: true },
  { label: '무단 결석', points: 3, applies: false },
  { label: '과제 부분 완료', points: 1, applies: true },
  { label: '과제 미완료', points: 2, applies: true },
  { label: '일일테스트 2차시 통과', points: 1, applies: true },
  { label: '일일테스트 3차시 통과', points: 2, applies: true },
  { label: '일일테스트 4차시 통과', points: 3, applies: true },
] as const

export const GRADE_THRESHOLDS = [
  { min: 90, label: '매우 우수' as const },
  { min: 80, label: '우수' as const },
  { min: 70, label: '양호' as const },
  { min: 0, label: '부족' as const },
]
