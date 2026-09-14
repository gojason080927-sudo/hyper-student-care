import { addDaysInSeoul, getSeoulDateString } from '../seoulDate.ts'

const SEOUL_TZ = 'Asia/Seoul'

/** Monday YYYY-MM-DD of the Seoul calendar week containing dateString. */
export function getMondayOfWeek(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TZ,
    weekday: 'short',
  }).format(new Date(utc))
  const offset: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  return addDaysInSeoul(dateString, -(offset[weekday] ?? 0))
}

/** Saturday of the week that starts on monday (YYYY-MM-DD). */
export function getSaturdayOfWeek(monday: string): string {
  return addDaysInSeoul(monday, 5)
}

export function getFridayOfWeek(monday: string): string {
  return addDaysInSeoul(monday, 4)
}

export function listDatesInclusive(start: string, end: string): string[] {
  if (start > end) return []
  const dates: string[] = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDaysInSeoul(cursor, 1)
  }
  return dates
}

function seoulParts(date: Date): { date: string; hour: number; minute: number; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: get('weekday'),
  }
}

/**
 * Last Saturday 08:00 Asia/Seoul that has already passed at `now`.
 * If it is Saturday before 08:00, use the previous Saturday.
 */
export function getLastWeeklySummaryCutoff(now: Date = new Date()): {
  asOf: Date
  asOfIso: string
  saturdayDate: string
  weekStart: string
  periodEnd: string
} {
  const parts = seoulParts(now)
  const mondayThisWeek = getMondayOfWeek(parts.date)
  const saturdayThisWeek = getSaturdayOfWeek(mondayThisWeek)
  const reachedCutoff =
    parts.date > saturdayThisWeek ||
    (parts.date === saturdayThisWeek && parts.hour >= 8)

  const saturdayDate = reachedCutoff
    ? saturdayThisWeek
    : addDaysInSeoul(saturdayThisWeek, -7)
  const weekStart = getMondayOfWeek(saturdayDate)

  const asOf = new Date(
    `${saturdayDate}T08:00:00+09:00`,
  )

  return {
    asOf,
    asOfIso: asOf.toISOString(),
    saturdayDate,
    weekStart,
    periodEnd: getFridayOfWeek(weekStart),
  }
}

export function formatPeriodLabel(start: string, end: string): string {
  const [, startMonth, startDay] = start.split('-').map(Number)
  const [, endMonth, endDay] = end.split('-').map(Number)
  return `${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`
}

export function isDateOnOrBefore(date: string, asOfDate: string): boolean {
  return date <= asOfDate
}

export function todaySeoul(): string {
  return getSeoulDateString()
}
