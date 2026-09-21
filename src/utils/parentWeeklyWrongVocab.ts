import type { DailyTestRecord, WeeklyLearningSummaryRecord } from '../types/records'
import type { MathWeeklyRecoveryFacts } from './mathDailyTest'
import { weekDatesMondayToFriday } from './studentCare/dailyTestWeeklyFlow'
import { getMondayOfWeek, getFridayOfWeek, formatPeriodLabel } from './studentCare/week'
import { getSeoulDateString } from './seoulDate'

export function listParentWeeklyWrongVocabWeeks(params: {
  studentId: string
  dailyTests: DailyTestRecord[]
  weeklySummaries: WeeklyLearningSummaryRecord[]
  today?: string
}): string[] {
  const weeks = new Set<string>()
  weeks.add(getMondayOfWeek(params.today ?? getSeoulDateString()))
  for (const record of params.dailyTests) {
    if (record.studentId === params.studentId && record.date) {
      weeks.add(getMondayOfWeek(record.date))
    }
  }
  for (const summary of params.weeklySummaries) {
    if (summary.studentId === params.studentId && summary.weekStart) {
      weeks.add(summary.weekStart)
    }
  }
  return [...weeks].sort((a, b) => b.localeCompare(a))
}

/** 최초 진입: 월~금 집계 대상 daily_tests가 있는 가장 최근 주. 없으면 이번 주. */
export function pickDefaultParentWeeklyWrongVocabWeek(params: {
  studentId: string
  dailyTests: DailyTestRecord[]
  today?: string
}): string {
  const currentWeek = getMondayOfWeek(params.today ?? getSeoulDateString())
  let latest: string | null = null
  for (const record of params.dailyTests) {
    if (record.studentId !== params.studentId || !record.date) continue
    const monday = getMondayOfWeek(record.date)
    if (!weekDatesMondayToFriday(monday).includes(record.date)) continue
    if (!latest || monday.localeCompare(latest) > 0) latest = monday
  }
  return latest ?? currentWeek
}

export function weeklyWrongVocabPeriodLabel(weekStart: string): string {
  return formatPeriodLabel(weekStart, getFridayOfWeek(weekStart))
}

export function summarizeParentWeeklyMathRecovery(
  facts: MathWeeklyRecoveryFacts[],
): MathWeeklyRecoveryFacts | null {
  if (facts.length === 0) return null
  const discoveredWrong = facts.reduce((sum, item) => sum + item.discoveredWrong, 0)
  const recoveredWrong = facts.reduce((sum, item) => sum + item.recoveredWrong, 0)
  const unrecoveredWrong = facts.reduce((sum, item) => sum + item.unrecoveredWrong, 0)
  const retakeQuestionCount = facts.reduce((sum, item) => sum + item.retakeQuestionCount, 0)
  return {
    discoveredWrong,
    recoveredWrong,
    unrecoveredWrong,
    retakeQuestionCount,
    recoveryRate: discoveredWrong === 0 ? null : (recoveredWrong / discoveredWrong) * 100,
  }
}

export function pickLatestParentWeeklyVocab(
  results: Array<{ date: string; totalWords: number; wrongWords: number; label: string }>,
): { date: string; totalWords: number; wrongWords: number; label: string } | null {
  if (results.length === 0) return null
  return [...results].sort((a, b) => b.date.localeCompare(a.date))[0]
}
