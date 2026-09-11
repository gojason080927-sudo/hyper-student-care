import { addDaysInSeoul, getSeoulDateString } from './seoulDate.ts'

/** 오늘 포함 최근 30일. DB 삭제가 아니라 학부모 UI 조회 범위다. */
export const PARENT_TODAY_REPORT_HISTORY_DAYS = 30

export const PARENT_TODAY_REPORT_EMPTY_DAY_MESSAGE = '해당 날짜의 학습 기록이 없습니다.'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const PARENT_TODAY_REPORT_SECTION_EMPTY_TODAY = {
  attendance: '오늘 등록된 출결 정보가 없습니다.',
  homework: '오늘 등록된 숙제 정보가 없습니다.',
  progress: '오늘 등록된 진도 정보가 없습니다.',
  dailyTest: '오늘 등록된 일일 테스트 결과가 없습니다.',
  classNote: '등록된 코멘트가 없습니다.',
} as const

export const PARENT_TODAY_REPORT_SECTION_EMPTY_HISTORICAL = {
  attendance: '해당 날짜에 등록된 출결 정보가 없습니다.',
  homework: '해당 날짜에 등록된 숙제 정보가 없습니다.',
  progress: '해당 날짜에 등록된 진도 정보가 없습니다.',
  dailyTest: '해당 날짜에 등록된 일일 테스트 결과가 없습니다.',
  classNote: '해당 날짜에 등록된 코멘트가 없습니다.',
} as const

export type ParentTodayReportEmptySection = keyof typeof PARENT_TODAY_REPORT_SECTION_EMPTY_TODAY

export function getParentTodayReportSectionEmptyMessages(historical: boolean) {
  return historical
    ? PARENT_TODAY_REPORT_SECTION_EMPTY_HISTORICAL
    : PARENT_TODAY_REPORT_SECTION_EMPTY_TODAY
}

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

/** Native date inputs can emit empty or out-of-range values; always stay in the 30-day window. */
export function selectParentTodayReportDate(
  next: string,
  today: string = getSeoulDateString(),
): string {
  if (!ISO_DATE.test(next)) return today
  return clampParentTodayReportDate(next, today)
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
