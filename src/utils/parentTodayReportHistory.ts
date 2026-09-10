import { addDaysInSeoul, getSeoulDateString } from './seoulDate.ts'

/** 오늘 포함 최근 30일. DB 삭제가 아니라 학부모 UI 조회 범위다. */
export const PARENT_TODAY_REPORT_HISTORY_DAYS = 30

export function getParentTodayReportMinDate(today: string = getSeoulDateString()): string {
  return addDaysInSeoul(today, -(PARENT_TODAY_REPORT_HISTORY_DAYS - 1))
}

export function clampParentTodayReportDate(
  date: string,
  today: string = getSeoulDateString(),
): string {
  const minDate = getParentTodayReportMinDate(today)
  if (date < minDate) return minDate
  if (date > today) return today
  return date
}

export function canShiftParentTodayReportDate(
  date: string,
  delta: number,
  today: string = getSeoulDateString(),
): boolean {
  const next = addDaysInSeoul(date, delta)
  const minDate = getParentTodayReportMinDate(today)
  return next >= minDate && next <= today
}

export function isParentTodayReportHistoricalDate(
  date: string,
  today: string = getSeoulDateString(),
): boolean {
  return date < today
}
