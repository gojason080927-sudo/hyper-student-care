const SEOUL_TIMEZONE = 'Asia/Seoul'

/** YYYY-MM-DD in Asia/Seoul */
export function getSeoulDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function addDaysInSeoul(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day + delta)
  return getSeoulDateString(new Date(utc))
}

export function getPreviousSeoulDateString(dateString: string): string {
  return addDaysInSeoul(dateString, -1)
}

export function isTodaySeoul(dateString: string): boolean {
  return dateString === getSeoulDateString()
}
