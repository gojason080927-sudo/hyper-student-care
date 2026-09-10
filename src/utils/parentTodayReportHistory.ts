import { addDaysInSeoul } from './seoulDate'

/** Parent Today Report history window: today inclusive, 30 calendar days. */
export const PARENT_TODAY_REPORT_HISTORY_DAYS = 30

export function getParentTodayReportHistoryStartDate(today: string): string {
  return addDaysInSeoul(today, -(PARENT_TODAY_REPORT_HISTORY_DAYS - 1))
}

export function isWithinParentTodayReportHistoryRange(
  date: string,
  today: string,
): boolean {
  const start = getParentTodayReportHistoryStartDate(today)
  return date >= start && date <= today
}

export function clampParentTodayReportDate(date: string, today: string): string {
  if (date > today) return today
  const start = getParentTodayReportHistoryStartDate(today)
  if (date < start) return start
  return date
}

export function canGoParentHistoryPrev(date: string, today: string): boolean {
  return date > getParentTodayReportHistoryStartDate(today)
}

export function canGoParentHistoryNext(date: string, today: string): boolean {
  return date < today
}
