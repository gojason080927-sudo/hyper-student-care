import type { DailyTestRecord, WeeklyLearningSummaryRecord } from '../types/records'
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

export function weeklyWrongVocabPeriodLabel(weekStart: string): string {
  return formatPeriodLabel(weekStart, getFridayOfWeek(weekStart))
}
