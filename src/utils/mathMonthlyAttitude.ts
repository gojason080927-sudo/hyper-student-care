import type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  StudentDailyCareRecord,
} from '../types/records'
import { getFinalPassSession, migrateSessionResults } from './dailyTest'
import { classifyHomeworkStatus } from './homework'
import {
  aggregateMonthlyLearningProgress,
  collectHomeworkSources,
  isDateInYearMonth,
  type ComprehensiveGrade,
  type MonthlyLearningCounts,
} from './monthlyLearningProgress'

/** 월간 학습진단과 같은 집계(점수·등급·감점 횟수)에 보고서용 분모(전체 횟수)를 더한다. */
export type MathAttitude = {
  attendance: { rate: number | null; absent: number; late: number }
  homework: { rate: number | null; done: number; total: number }
  firstPass: { rate: number | null; passed: number; total: number }
  /** 수업 태도: 기록 있는 날 중 문제(attitudeIssues)가 없던 날. 기록이 없으면 rate=null. 종합 점수에는 넣지 않는다. */
  classAttitude: { rate: number | null; okDays: number; recordedDays: number; issues: Record<string, number> }
  /** 합격 차시(1~4차)가 기록되지 않은 일일테스트 수 (점수 계산에서 제외, 자동 감점 없음) */
  unrecordedTests: number
  score: number
  grade: ComprehensiveGrade
  counts: MonthlyLearningCounts
}

/** 해당 월에 합격 차시가 기록되지 않은 일일테스트 수 (날짜 기준 중복 제외) */
export function countUnrecordedDailyTests(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number {
  const dates = new Set<string>()
  let count = 0
  for (const test of dailyTests) {
    if (test.studentId !== studentId || !isDateInYearMonth(test.date, year, month)) continue
    if (dates.has(test.date)) continue
    dates.add(test.date)
    if (getFinalPassSession(migrateSessionResults(test)) === null) count += 1
  }
  return count
}

const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 100) : null

export function buildMathAttitude(input: {
  studentId: string
  year: number
  month: number
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  dailyTests: DailyTestRecord[]
  studentDailyCare: StudentDailyCareRecord[]
}): MathAttitude {
  const { studentId, year, month } = input
  const progress = aggregateMonthlyLearningProgress(input)

  const attendanceDates = new Set<string>()
  for (const record of input.attendance) {
    if (record.studentId === studentId && isDateInYearMonth(record.date, year, month)) {
      attendanceDates.add(record.date)
    }
  }

  const sources = collectHomeworkSources(
    input.homeworkTextbookEntries,
    input.homework,
    studentId,
    year,
    month,
  )
  let hwTotal = 0
  let hwDone = 0
  for (const item of sources) {
    const category = classifyHomeworkStatus(item.record.status)
    if (category === 'none') continue
    hwTotal += 1
    if (category === 'complete') hwDone += 1
  }

  // 월간 학습진단 점수(감점)는 '합격 차시가 기록된 일일테스트'만 센다.
  // 원형 그래프도 같은 기록(합격 차시 1~4차)만 기준으로 해서 종합 점수와 숫자가 맞게 한다.
  const testDates = new Set<string>()
  let firstPass = 0
  let retestPass = 0
  let unrecordedTests = 0
  for (const test of input.dailyTests) {
    if (test.studentId !== studentId || !isDateInYearMonth(test.date, year, month)) continue
    if (testDates.has(test.date)) continue
    testDates.add(test.date)
    const finalPass = getFinalPassSession(migrateSessionResults(test))
    if (finalPass === 1) firstPass += 1
    else if (finalPass !== null) retestPass += 1
    else unrecordedTests += 1
  }
  const passedTotal = firstPass + retestPass

  const careDates = new Set<string>()
  let okDays = 0
  const issues: Record<string, number> = {}
  for (const care of input.studentDailyCare) {
    if (care.studentId !== studentId || !isDateInYearMonth(care.date, year, month)) continue
    if (careDates.has(care.date)) continue
    careDates.add(care.date)
    if (care.attitudeIssues.length === 0) okDays += 1
    for (const issue of care.attitudeIssues) issues[issue] = (issues[issue] ?? 0) + 1
  }

  return {
    attendance: {
      rate: pct(attendanceDates.size - progress.counts.absentCount, attendanceDates.size),
      absent: progress.counts.absentCount,
      late: progress.counts.lateCount,
    },
    homework: { rate: pct(hwDone, hwTotal), done: hwDone, total: hwTotal },
    firstPass: { rate: pct(firstPass, passedTotal), passed: firstPass, total: passedTotal },
    classAttitude: { rate: pct(okDays, careDates.size), okDays, recordedDays: careDates.size, issues },
    unrecordedTests,
    score: progress.score,
    grade: progress.grade,
    counts: progress.counts,
  }
}
